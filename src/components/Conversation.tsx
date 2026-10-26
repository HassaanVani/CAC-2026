import { useEffect, useReducer, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleHelp,
  Expand,
  Mic,
  Pause,
  Pencil,
  Play,
  Plus,
  Send,
  SlidersHorizontal,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import {
  emptyTranscript,
  exportTranscript,
  sampleEntries,
  transcriptReducer,
} from "../lib/transcript";
import {
  SpeechSession,
  speechSupported,
  type DeviceState,
} from "../lib/speech";
import { AudioMeter, estimatePace, type AudioReading } from "../lib/audio";
import { readStored, saveStored } from "../lib/storage";

export default function Conversation({ active }: { active: boolean }) {
  const [transcript, dispatch] = useReducer(transcriptReducer, emptyTranscript);
  const [state, setState] = useState<DeviceState>("idle");
  const [notice, setNotice] = useState("");
  const [reply, setReply] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [large, setLarge] = useState(false);
  const [size, setSize] = useState<number>(() => {
    const value = readStored("common-caption-size", 28);
    return [24, 28, 36].includes(value) ? value : 28;
  });
  const [phrases, setPhrases] = useState([
    "Please repeat that.",
    "Could you slow down?",
    "Thank you!",
  ]);
  const [editing, setEditing] = useState(false);
  const [audioState, setAudioState] = useState<DeviceState>("idle");
  const [audioNotice, setAudioNotice] = useState("");
  const [reading, setReading] = useState<AudioReading>({
    level: 0,
    label: "Quiet",
  });
  const [pace, setPace] = useState<number | null>(null);
  const [settings, setSettings] = useState(false);
  const speech = useRef<SpeechSession | null>(null);
  const audio = useRef<AudioMeter | null>(null);
  const startTime = useRef(0);
  const samples = useRef<{ text: string; time: number }[]>([]);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const resume = useRef(false);
  const speakTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const speechRun = useRef(0);

  useEffect(() => {
    speech.current = new SpeechSession({
      state: (next, message) => {
        setState(next);
        setNotice(message || "");
      },
      interim: (text) => dispatch({ type: "interim", text }),
      final: (text, id) => {
        const time = Date.now();
        samples.current.push({ text, time });
        samples.current = samples.current.filter((s) => s.time >= time - 30000);
        dispatch({
          type: "append",
          entry: { id: `speech-${id}`, speaker: "partner", text, time },
        });
      },
    });
    audio.current = new AudioMeter((next, message) => {
      setAudioState(next);
      setAudioNotice(message || "");
    }, setReading);
    return () => {
      speechRun.current++;
      clearTimeout(speakTimer.current);
      speech.current?.stop();
      audio.current?.stop();
      window.speechSynthesis?.cancel();
    };
  }, []);
  useEffect(() => {
    if (!active) {
      stop();
      setLarge(false);
    }
  }, [active]);
  useEffect(() => {
    saveStored("common-caption-size", size);
  }, [size]);
  useEffect(() => {
    scroller.current?.scrollTo({
      top: scroller.current.scrollHeight,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }, [transcript]);
  useEffect(() => {
    if (state !== "active") {
      setPace(null);
      return;
    }
    const timer = setInterval(
      () =>
        setPace(estimatePace(samples.current, Date.now(), startTime.current)),
      1000,
    );
    return () => clearInterval(timer);
  }, [state]);
  useEffect(() => {
    if (!large) return;
    const previous = document.activeElement as HTMLElement | null;
    workspaceRef.current
      ?.querySelector<HTMLButtonElement>('[aria-label="Exit large text view"]')
      ?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLarge(false);
      if (e.key === "Tab") {
        const controls = Array.from(
          workspaceRef.current?.querySelectorAll<HTMLElement>(
            "button:not(:disabled), textarea, select, input, a[href]",
          ) || [],
        ).filter((el) => el.offsetParent !== null);
        const first = controls[0],
          last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [large]);

  function start() {
    if (transcript.sample) dispatch({ type: "clear" });
    startTime.current = Date.now();
    samples.current = [];
    speech.current?.start();
  }
  function stop() {
    resume.current = false;
    speechRun.current++;
    clearTimeout(speakTimer.current);
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    speech.current?.stop();
    audio.current?.stop();
  }
  function send(speak: boolean) {
    const text = reply.trim();
    if (!text) return;
    dispatch({
      type: "append",
      entry: {
        id: crypto.randomUUID(),
        speaker: "you",
        text,
        time: Date.now(),
      },
    });
    setReply("");
    if (!speak) return;
    if (!window.speechSynthesis) {
      setNotice(
        "Your reply was added. Text-to-speech is unavailable in this browser.",
      );
      return;
    }
    resume.current = state === "active" || state === "loading";
    speech.current?.stop();
    window.speechSynthesis.cancel();
    setSpeaking(true);
    const run = ++speechRun.current;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.95;
    const finish = () => {
      if (run !== speechRun.current) return;
      clearTimeout(speakTimer.current);
      setSpeaking(false);
      if (resume.current) {
        resume.current = false;
        speakTimer.current = setTimeout(() => {
          startTime.current = Date.now();
          samples.current = [];
          speech.current?.start();
        }, 450);
      }
    };
    utterance.onend = finish;
    utterance.onerror = () => {
      setNotice("Your reply was added, but speech playback failed.");
      finish();
    };
    // Allow recognition to release the microphone before the first spoken word.
    speakTimer.current = setTimeout(() => {
      if (run === speechRun.current) window.speechSynthesis.speak(utterance);
    }, 250);
  }
  function stopSpeaking() {
    speechRun.current++;
    clearTimeout(speakTimer.current);
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    if (resume.current) {
      resume.current = false;
      start();
    }
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([exportTranscript(transcript)], {
        type: "text/plain;charset=utf-8",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `common-conversation-${new Date().toISOString().slice(0, 10)}.txt`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function sample() {
    stop();
    dispatch({ type: "sample", entries: sampleEntries() });
  }
  const listening = state === "active" || state === "loading";

  return (
    <div
      ref={workspaceRef}
      role={large ? "dialog" : undefined}
      aria-modal={large ? true : undefined}
      aria-label={large ? "Expanded conversation" : undefined}
      className={`conversation-layout ${large ? "expanded" : ""}`}
    >
      <section
        className="conversation-main"
        aria-label="Conversation workspace"
      >
        <div className="caption-card">
          <div className="card-toolbar">
            <span className="eyebrow">
              <span
                className={`status-dot ${state === "active" ? "live" : ""}`}
              />
              {transcript.sample
                ? "SAMPLE CONVERSATION"
                : speaking
                  ? "SPEAKING YOUR REPLY"
                  : state === "active"
                    ? "LISTENING"
                    : state === "loading"
                      ? "CONNECTING"
                      : "LIVE TRANSCRIPT"}
            </span>
            <div className="toolbar-actions">
              <button
                className="icon-button"
                aria-label="Caption display settings"
                aria-expanded={settings}
                onClick={() => setSettings(!settings)}
              >
                <SlidersHorizontal size={17} />
              </button>
              <button
                className="icon-button"
                aria-label={
                  large ? "Exit large text view" : "Open large text view"
                }
                aria-pressed={large}
                onClick={() => setLarge(!large)}
              >
                {large ? <X size={19} /> : <Expand size={18} />}
              </button>
            </div>
          </div>
          {settings && (
            <div className="display-settings">
              <label htmlFor="caption-size">Caption size</label>
              <select
                id="caption-size"
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
              >
                <option value={24}>Comfortable</option>
                <option value={28}>Large</option>
                <option value={36}>Extra large</option>
              </select>
              <button
                className="text-button"
                onClick={() => setSettings(false)}
              >
                Done
              </button>
            </div>
          )}
          <div
            className="transcript"
            ref={scroller}
            style={
              {
                "--caption-size": `${large ? Math.max(size, 36) : size}px`,
              } as React.CSSProperties
            }
            role="log"
            aria-label="Conversation transcript"
            aria-live="polite"
            aria-relevant="additions text"
          >
            {!transcript.entries.length && !transcript.interim ? (
              <div className="empty-conversation">
                <div className="conversation-symbol" aria-hidden="true">
                  <span>“</span>
                  <span>”</span>
                </div>
                <h2>
                  A space to understand
                  <br />
                  each other.
                </h2>
                <p>
                  Every word deserves to be part
                  <br className="desktop-break" /> of the conversation.
                </p>
                <div className="empty-hint">
                  <Mic size={15} />
                  <span>Start captions when you’re ready</span>
                </div>
              </div>
            ) : (
              <>
                {transcript.sample && (
                  <p className="sample-label">
                    <Sparkles size={14} /> Sample · illustrative content, not
                    live audio
                  </p>
                )}
                {transcript.entries.map((entry) => (
                  <article
                    className={`transcript-entry ${entry.speaker}`}
                    key={entry.id}
                  >
                    <div className="entry-meta">
                      <span>{entry.speaker === "you" ? "YOU" : "PARTNER"}</span>
                      <time>
                        {new Date(entry.time).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </div>
                    <p>{entry.text}</p>
                  </article>
                ))}
                {transcript.interim && (
                  <article className="transcript-entry interim">
                    <div className="entry-meta">
                      PARTNER · CAPTION IN PROGRESS
                    </div>
                    <p>
                      {transcript.interim}
                      <span className="typing-cursor" />
                    </p>
                  </article>
                )}
              </>
            )}
          </div>
          {notice && (
            <div
              className={`notice ${state === "error" ? "error" : ""}`}
              role="status"
            >
              {notice}
            </div>
          )}
          {!speechSupported() && (
            <div className="notice">
              Live captions are unavailable here. Try desktop Chrome, or use
              typed replies.
            </div>
          )}
          <div className="caption-controls">
            <button
              className={`primary-button ${listening ? "listening" : ""}`}
              disabled={speaking}
              onClick={listening ? stop : start}
            >
              {listening ? <Pause size={17} /> : <Mic size={17} />}
              <span>
                {state === "loading"
                  ? "Cancel connection"
                  : state === "active"
                    ? "Pause captions"
                    : "Start captions"}
              </span>
            </button>
            <span className="language">
              <span className="language-dot" />
              English (US)
              <ChevronDown size={13} aria-hidden="true" />
            </span>
            <div className="transcript-tools">
              <button
                className="icon-button"
                aria-label="Download transcript"
                title="Download transcript"
                disabled={!transcript.entries.length}
                onClick={download}
              >
                <ArrowDownToLine size={18} />
              </button>
              <button
                className="text-button muted"
                disabled={!transcript.entries.length && !transcript.interim}
                onClick={() => {
                  stop();
                  dispatch({ type: "clear" });
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
        <section className="reply-card" aria-labelledby="reply-title">
          <div className="reply-heading">
            <h2 id="reply-title">Your side of the conversation</h2>
            <span>Type it. Share it. Be heard.</span>
          </div>
          <label className="sr-only" htmlFor="reply">
            Type your reply
          </label>
          <textarea
            id="reply"
            placeholder="Write a reply…"
            value={reply}
            maxLength={2000}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                if (!speaking) send(true);
              }
            }}
          />
          <div className="reply-actions">
            <span className="keyboard-hint">⌘ / Ctrl + Enter to speak</span>
            <div>
              <button
                className="text-button"
                disabled={!reply.trim()}
                onClick={() => send(false)}
              >
                <Send size={14} /> Add text
              </button>
              <button
                className="secondary-button"
                disabled={!reply.trim() || speaking}
                onClick={() => send(true)}
              >
                <Volume2 size={16} /> Speak reply
              </button>
            </div>
          </div>
          {speaking && (
            <div className="speaking-status" role="status">
              <Volume2 size={15} /> Speaking · captions paused{" "}
              <button className="text-button" onClick={stopSpeaking}>
                Stop speaking
              </button>
            </div>
          )}
        </section>
        <div className="quick-replies">
          <div className="quick-heading">
            <span className="eyebrow">A FEW WORDS, READY WHEN YOU ARE</span>
            <button
              className="text-button"
              onClick={() => setEditing(!editing)}
            >
              {editing ? <Check size={14} /> : <Pencil size={13} />}{" "}
              {editing ? "Done" : "Edit phrases"}
            </button>
          </div>
          <div className="phrase-list">
            {phrases.map((phrase, index) =>
              editing ? (
                <label key={index} className="sr-phrase">
                  <span className="sr-only">Quick phrase {index + 1}</span>
                  <input
                    maxLength={100}
                    value={phrase}
                    onChange={(e) =>
                      setPhrases((old) =>
                        old.map((p, i) => (i === index ? e.target.value : p)),
                      )
                    }
                  />
                </label>
              ) : (
                <button
                  key={index}
                  className="phrase"
                  onClick={() => {
                    setReply(phrase);
                    document.getElementById("reply")?.focus();
                  }}
                >
                  <Plus size={14} />
                  {phrase || "Edit this phrase"}
                </button>
              ),
            )}
          </div>
        </div>
      </section>
      <aside className="context-column" aria-label="Conversation tools">
        <section className="voice-card">
          <div className="section-title">
            <span className="small-icon">
              <Volume2 size={18} />
            </span>
            <h2>Beyond the words</h2>
          </div>
          <p>
            A little context for how
            <br />
            something is said.
          </p>
          <div className="voice-toggle-row">
            <span>Voice cues</span>
            <button
              className="toggle"
              role="switch"
              aria-checked={audioState === "active" || audioState === "loading"}
              aria-label="Enable microphone voice cues"
              onClick={() =>
                audioState === "active" || audioState === "loading"
                  ? audio.current?.stop()
                  : void audio.current?.start()
              }
            >
              <span />
            </button>
          </div>
          <div className="voice-metric">
            <div>
              <span>Microphone level</span>
              <span>{audioState === "active" ? reading.label : "Off"}</span>
            </div>
            <div className="level-bars" aria-hidden="true">
              {Array.from({ length: 24 }, (_, i) => (
                <i
                  key={i}
                  className={
                    audioState === "active" && i / 24 < reading.level
                      ? "filled"
                      : ""
                  }
                  style={{ height: `${10 + Math.sin(i * 0.7) ** 2 * 14}px` }}
                />
              ))}
            </div>
            <small>Relative level · depends on mic distance</small>
          </div>
          <div className="voice-metric pace">
            <span>Speaking pace</span>
            <strong>
              {pace !== null && !transcript.sample ? pace : "—"}
              <small> est. words/min</small>
            </strong>
            <small>
              {state === "active"
                ? "Estimated over the last 30 seconds"
                : "Available while captions are listening"}
            </small>
          </div>
          {audioNotice && (
            <p className="notice error" role="status">
              {audioNotice}
            </p>
          )}
          <div className="card-footnote">
            <CircleHelp size={14} />
            <span>Voice cues describe sound, not emotions.</span>
          </div>
        </section>
        <section className="tip-card">
          <span className="eyebrow">SMALL THINGS. BETTER CONNECTION.</span>
          <div className="tip-illustration" aria-hidden="true">
            <span className="face one">◡</span>
            <span className="tip-connector">···</span>
            <span className="face two">◡</span>
          </div>
          <h3>Face each other.</h3>
          <p>
            Good lighting and a clear view of your face can make a conversation
            easier to follow.
          </p>
        </section>
        <button className="sample-button" onClick={sample}>
          <span className="sample-icon">
            <Play size={15} />
          </span>
          <span>
            <strong>Take a quick look</strong>
            <small>Try a sample conversation</small>
          </span>
          <ArrowUpRight size={17} />
        </button>
        <p className="privacy-note">
          <Check size={13} />
          <span>
            Your transcript stays in this tab. Browser speech recognition may
            send audio to its provider. No audio is recorded by Common.
          </span>
        </p>
      </aside>
    </div>
  );
}
