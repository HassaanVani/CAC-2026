import { useEffect, useReducer, useRef, useState } from "react";
import {
  ArrowDownToLine,
  Check,
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
    <section
      ref={workspaceRef}
      role={large ? "dialog" : undefined}
      aria-modal={large ? true : undefined}
      aria-label={large ? "Expanded conversation" : "Conversation workspace"}
      className={`conversation-workspace unified-workspace ${large ? "expanded" : ""}`}
    >
      <header className="session-toolbar">
        <div className="session-label">
          <span className={`status-dot ${state === "active" ? "live" : ""}`} />
          <div>
            <strong>
              {transcript.sample
                ? "Sample conversation"
                : speaking
                  ? "Speaking your reply"
                  : state === "active"
                    ? "Listening to your partner"
                    : state === "loading"
                      ? "Connecting microphone…"
                      : "Your conversation"}
            </strong>
            <span>
              {transcript.sample
                ? "Illustrative content · not live audio"
                : "English (US) · live captions"}
            </span>
          </div>
        </div>
        <div className="session-actions">
          <button
            className="icon-button"
            aria-label="Caption display settings"
            aria-expanded={settings}
            onClick={() => setSettings(!settings)}
          >
            <SlidersHorizontal size={18} />
          </button>
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
            className="icon-button"
            aria-label={large ? "Exit large text view" : "Open large text view"}
            aria-pressed={large}
            onClick={() => setLarge(!large)}
          >
            {large ? <X size={19} /> : <Expand size={18} />}
          </button>
          <button
            className={`primary-button ${listening ? "listening" : ""}`}
            disabled={speaking}
            onClick={listening ? stop : start}
          >
            {listening ? <Pause size={16} /> : <Mic size={16} />}
            {state === "loading"
              ? "Cancel"
              : state === "active"
                ? "Pause captions"
                : "Start captions"}
          </button>
        </div>
      </header>
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
          <button className="text-button" onClick={() => setSettings(false)}>
            Done
          </button>
        </div>
      )}
      <div className="conversation-body">
        <div className="conversation-column">
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
                <span className="empty-quote" aria-hidden="true">
                  “
                </span>
                <h2>
                  Good things begin
                  <br />
                  with understanding.
                </h2>
                <p>
                  Turn on captions, and give every word
                  <br />a place in the conversation.
                </p>
                <span className="empty-hint">
                  <Mic size={14} />
                  Your microphone starts when you choose.
                </span>
              </div>
            ) : (
              <>
                {transcript.sample && (
                  <p className="sample-label">
                    <Sparkles size={14} />
                    Sample conversation · illustrative content
                  </p>
                )}
                {transcript.entries.map((entry) => (
                  <article
                    className={`transcript-entry ${entry.speaker}`}
                    key={entry.id}
                  >
                    <div className="entry-meta">
                      <span>{entry.speaker === "you" ? "You" : "Partner"}</span>
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
                      Partner · caption in progress
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
            <p
              className={`notice ${state === "error" ? "error" : ""}`}
              role="status"
            >
              {notice}
            </p>
          )}
          {!speechSupported() && (
            <p className="notice">
              Live captions need desktop Chrome. You can still type and share
              replies.
            </p>
          )}
          <section className="reply-dock" aria-labelledby="reply-title">
            <div className="dock-heading">
              <h2 id="reply-title">Your turn.</h2>
              <span>Type a reply. We’ll help you say it.</span>
            </div>
            <label className="sr-only" htmlFor="reply">
              Type your reply
            </label>
            <textarea
              id="reply"
              placeholder="What would you like to say?"
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
                  <Send size={14} />
                  Add text
                </button>
                <button
                  className="primary-button reply-speak"
                  disabled={!reply.trim() || speaking}
                  onClick={() => send(true)}
                >
                  <Volume2 size={16} />
                  Speak reply
                </button>
              </div>
            </div>
            {speaking && (
              <p className="speaking-status" role="status">
                <Volume2 size={15} />
                Speaking · captions paused
                <button className="text-button" onClick={stopSpeaking}>
                  Stop speaking
                </button>
              </p>
            )}
          </section>
        </div>
        <aside className="conversation-rail" aria-label="Conversation tools">
          <section className="quick-phrases">
            <div className="rail-heading">
              <h2>A few words, ready.</h2>
              <button
                className="icon-button"
                aria-label={
                  editing ? "Finish editing phrases" : "Edit quick phrases"
                }
                onClick={() => setEditing(!editing)}
              >
                {editing ? <Check size={15} /> : <Pencil size={14} />}
              </button>
            </div>
            <p>Tap a phrase to start a reply.</p>
            <div className="phrase-list">
              {phrases.map((phrase, index) =>
                editing ? (
                  <label key={index}>
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
          </section>
          <section className="voice-section">
            <div className="rail-heading">
              <h2>
                <Volume2 size={16} />
                Beyond the words
              </h2>
              <button
                className="toggle"
                role="switch"
                aria-label="Enable microphone voice cues"
                aria-checked={
                  audioState === "active" || audioState === "loading"
                }
                onClick={() =>
                  audioState === "active" || audioState === "loading"
                    ? audio.current?.stop()
                    : void audio.current?.start()
                }
              >
                <span />
              </button>
            </div>
            <p>Optional loudness and pace cues.</p>
            <div className="voice-metric">
              <div>
                <span>Microphone level</span>
                <strong>
                  {audioState === "active" ? reading.label : "Off"}
                </strong>
              </div>
              <div className="level-bars" aria-hidden="true">
                {Array.from({ length: 28 }, (_, i) => (
                  <i
                    key={i}
                    className={
                      audioState === "active" && i / 28 < reading.level
                        ? "filled"
                        : ""
                    }
                    style={{ height: `${8 + Math.sin(i * 0.7) ** 2 * 20}px` }}
                  />
                ))}
              </div>
              <small>Relative to your mic and its distance.</small>
            </div>
            <div className="pace-metric">
              <span>Speaking pace</span>
              <strong>
                {pace !== null && !transcript.sample ? pace : "—"}
                <small> est. words/min</small>
              </strong>
              <small>
                {state === "active"
                  ? "Estimated over the last 30 seconds."
                  : "Available with live captions."}
              </small>
            </div>
            {audioNotice && (
              <p className="notice error" role="status">
                {audioNotice}
              </p>
            )}
            <p className="cue-note">
              <CircleHelp size={13} />
              Sound cues, not emotion labels.
            </p>
          </section>
          <button className="sample-link" onClick={sample}>
            <Play size={14} />
            <span>Try a sample conversation</span>
            <span aria-hidden="true">↗</span>
          </button>
        </aside>
      </div>
      <footer className="workspace-bottom">
        <span>
          <Check size={13} />
          Your transcript stays in this tab. Browser speech may use an online
          provider.
        </span>
        <button
          className="text-button"
          disabled={!transcript.entries.length && !transcript.interim}
          onClick={() => {
            stop();
            dispatch({ type: "clear" });
          }}
        >
          Clear conversation
        </button>
      </footer>
    </section>
  );
}
