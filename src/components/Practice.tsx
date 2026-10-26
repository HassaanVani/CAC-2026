import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Camera,
  CameraOff,
  Check,
  CheckCircle2,
  Copy,
  Delete,
  ExternalLink,
  Expand,
  X,
  FlipHorizontal2,
  Hand,
  Lightbulb,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Space,
  Volume2,
} from "lucide-react";
import {
  handQuality,
  letters,
  lessons,
  matchHandshape,
  personalLetters,
  StableHold,
  type Letter,
  type Point,
} from "../lib/handshape";
import {
  demoLetters,
  poseDistance,
  poseVector,
  readProfiles,
  resolveLetter,
  sampleCount,
  type Profiles,
} from "../lib/calibration";
import {
  demoPhrase,
  LetterCapture,
  phrasePrefix,
  spellingOf,
  wordDrills,
} from "../lib/fingerspelling";
import { readStored, saveStored } from "../lib/storage";
import { useHandCamera } from "../hooks/useHandCamera";
import HandDiagram from "./HandDiagram";
export default function Practice() {
  const [focused, setFocused] = useState(false);
  const studioRoot = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!focused) return;
    const previous = document.activeElement as HTMLElement | null;
    studioRoot.current
      ?.querySelector<HTMLButtonElement>('[aria-label="Exit studio focus"]')
      ?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFocused(false);
      if (event.key === "Tab") {
        const controls = Array.from(
          studioRoot.current?.querySelectorAll<HTMLElement>(
            "button:not(:disabled),textarea,select,input,a[href]",
          ) || [],
        ).filter((el) => el.offsetParent !== null);
        if (event.shiftKey && document.activeElement === controls[0]) {
          event.preventDefault();
          controls.at(-1)?.focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === controls.at(-1)
        ) {
          event.preventDefault();
          controls[0]?.focus();
        }
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [focused]);
  const [letter, setLetter] = useState<Letter>("A");
  const [drill, setDrill] = useState<"letters" | "words">("letters");
  const [word, setWord] = useState<string>(demoPhrase),
    [wordIndex, setWordIndex] = useState(0),
    [wordDone, setWordDone] = useState(false);
  const [completed, setCompleted] = useState<Letter[]>(() => {
    const v = readStored<unknown>("common-completed", []);
    return Array.isArray(v) ? letters.filter((l) => v.includes(l)) : [];
  });
  const [profiles, setProfiles] = useState<Profiles>(() =>
    readProfiles(readStored("common-poses-v1", {})),
  );
  const [feedback, setFeedback] = useState("Start your camera to begin."),
    [progress, setProgress] = useState(0),
    [success, setSuccess] = useState(false);
  const [mirrored, setMirrored] = useState(true),
    [detected, setDetected] = useState<Letter | null>(null),
    [text, setText] = useState(""),
    [captureEnabled, setCaptureEnabled] = useState(true),
    [notice, setNotice] = useState("");
  const [recording, setRecording] = useState(false),
    [recordProgress, setRecordProgress] = useState(0),
    [setupIndex, setSetupIndex] = useState<number | null>(null);
  const capture = useRef(new LetterCapture()),
    hold = useRef(new StableHold()),
    matched = useRef(false);
  const recordingRef = useRef<{ letter: Letter; samples: number[][] } | null>(
    null,
  );
  const sequence = spellingOf(word);
  const target =
    drill === "words"
      ? sequence[Math.min(wordIndex, sequence.length - 1)]
      : letter;
  useEffect(() => {
    saveStored("common-completed", completed);
  }, [completed]);
  useEffect(() => {
    saveStored("common-poses-v1", profiles);
  }, [profiles]);
  useEffect(
    () => () => {
      window.speechSynthesis?.cancel();
    },
    [],
  );
  function resetTracking() {
    capture.current.reset();
    hold.current.reset();
    matched.current = false;
    setSuccess(false);
    setProgress(0);
    setDetected(null);
    recordingRef.current = null;
    setRecording(false);
    setRecordProgress(0);
  }
  function chooseLetter(next: Letter) {
    resetTracking();
    setLetter(next);
    setDrill("letters");
    setSetupIndex(null);
    setFeedback("Match the reference with either hand.");
  }
  function chooseWord(next: string) {
    resetTracking();
    setWord(next);
    setDrill("words");
    setSetupIndex(null);
    setWordIndex(0);
    setWordDone(false);
    setText("");
    setFeedback("Fingerspell each highlighted letter.");
  }
  function startSetup() {
    resetTracking();
    setSetupIndex(0);
    setLetter(demoLetters[0]);
    setDrill("letters");
    setFeedback("Make the reference handshape, then record your example.");
  }
  function record() {
    recordingRef.current = { letter: target, samples: [] };
    setRecording(true);
    setRecordProgress(0);
    capture.current.reset();
    setFeedback(`Hold ${target} steady while we collect your example.`);
  }
  function onFrame(
    image: Point[] | null,
    world: Point[] | undefined,
    now: number,
    count: number,
  ) {
    const quality =
      count > 1
        ? "Keep just one hand in the frame."
        : image
          ? handQuality(image)
          : "No hand detected. Raise one hand into view.";
    if (recordingRef.current) {
      if (quality || !image) {
        recordingRef.current.samples = [];
        setRecordProgress(0);
        setFeedback(quality || "Show your whole hand.");
        return;
      }
      const vector = poseVector(image, world);
      if (!vector) return;
      const job = recordingRef.current,
        last = job.samples[job.samples.length - 1];
      if (last && poseDistance(vector, last) > 0.12) {
        job.samples = [];
        setFeedback("Hold the same shape steady; collecting again.");
      }
      job.samples.push(vector);
      setRecordProgress(job.samples.length / sampleCount);
      if (job.samples.length >= sampleCount) {
        setProfiles((old) => ({ ...old, [job.letter]: job.samples }));
        recordingRef.current = null;
        setRecording(false);
        setRecordProgress(0);
        resetTracking();
        setNotice(
          `${job.letter} saved on this device. These are labeled examples, not an accuracy score.`,
        );
        if (setupIndex !== null && setupIndex < demoLetters.length - 1) {
          const next = setupIndex + 1;
          setSetupIndex(next);
          setLetter(demoLetters[next]);
          setFeedback(`Next: make ${demoLetters[next]}, then record.`);
        } else if (setupIndex !== null) {
          setSetupIndex(null);
          chooseWord(demoPhrase);
          setNotice(
            "Demo examples saved. Fingerspell “Hi, this is Common” one letter at a time.",
          );
        } else setFeedback("Example saved. Try matching the handshape again.");
      }
      return;
    }
    const found =
      !quality && image ? resolveLetter(image, world, profiles) : null;
    setDetected(found);
    const result = capture.current.update(found, now);
    if (drill === "words") {
      if (!wordDone) {
        setProgress(found === target ? result.progress : 0);
        setFeedback(
          quality ||
            (!found
              ? "No confident letter yet. Adjust your hand or record a personal example."
              : found !== target
                ? `Read ${found}. Next in the phrase: ${target}.`
                : result.repeat
                  ? "Lower your hand briefly before repeating this letter."
                  : `Reading ${found}. Hold steady…`),
        );
        if (result.letter === target) {
          const next = wordIndex + 1;
          setWordIndex(next);
          if (captureEnabled) setText(phrasePrefix(word, next));
          if (next === sequence.length) {
            setWordDone(true);
            setSuccess(true);
            setFeedback("Every letter matched. Your phrase is complete.");
          }
        }
      }
    } else {
      if (result.letter && captureEnabled)
        setText((old) => (old + result.letter).slice(0, 2000));
      const match = quality
        ? { match: false, message: quality }
        : image
          ? profiles[target]
            ? {
                match: found === target,
                message:
                  found === target
                    ? "Your personal example matches. Hold steady…"
                    : `Make ${target}, or record a clearer personal example.`,
              }
            : matchHandshape(image, target, world)
          : { match: false, message: "Show one hand." };
      if (!matched.current) {
        const value = hold.current.update(match.match, now);
        setProgress(value);
        setFeedback(
          result.repeat && found === target
            ? "Letter captured. Lower your hand briefly to repeat."
            : match.message,
        );
        if (value >= 1) {
          matched.current = true;
          setSuccess(true);
          setCompleted((old) =>
            old.includes(target) ? old : [...old, target],
          );
        }
      }
    }
  }
  const camera = useHandCamera(onFrame);
  const active = camera.state === "active",
    loading = camera.state === "loading";
  const setupNeeded = personalLetters.filter((l) => !profiles[l]);
  const next = letters[(letters.indexOf(target) + 1) % letters.length];
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Text copied.");
    } catch {
      setNotice(
        "Copy is unavailable here. Select the text and copy it manually.",
      );
    }
  }
  function speak() {
    if (!window.speechSynthesis) {
      setNotice("Speech playback is unavailable.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.onerror = () =>
      setNotice(
        "Speech playback could not start. Your text is still available.",
      );
    window.speechSynthesis.speak(utterance);
  }
  return (
    <section
      ref={studioRoot}
      role={focused ? "dialog" : undefined}
      aria-modal={focused ? true : undefined}
      className={`sign-studio unified-workspace ${drill === "words" ? "word-mode" : ""} ${focused ? "focused" : ""}`}
      aria-label="Sign studio"
    >
      <header className="studio-toolbar">
        <div className="segmented" aria-label="Practice mode">
          <button
            aria-pressed={drill === "letters"}
            onClick={() => chooseLetter(letter)}
          >
            Letter practice
          </button>
          <button
            aria-pressed={drill === "words"}
            onClick={() => chooseWord(word)}
          >
            Words & demo
          </button>
        </div>
        <div className="studio-tools">
          <span className="studio-private">
            <ShieldCheck size={15} />
            Camera processing stays on this device
          </span>
          <button
            className="icon-button"
            aria-label={focused ? "Exit studio focus" : "Focus sign studio"}
            aria-pressed={focused}
            onClick={() => setFocused(!focused)}
          >
            {focused ? <X size={18} /> : <Expand size={18} />}
          </button>
        </div>
      </header>
      <div className="lesson-ribbon">
        {drill === "letters" ? (
          <div className="alphabet-grid" aria-label="Choose an ASL letter">
            {letters.map((l) => (
              <button
                key={l}
                aria-pressed={target === l}
                className={target === l ? "selected" : ""}
                onClick={() => chooseLetter(l)}
              >
                <span>{l}</span>
                {completed.includes(l) && <Check size={12} />}
                <small>
                  {profiles[l]
                    ? "Personal"
                    : personalLetters.includes(l)
                      ? "Set up"
                      : "Ready"}
                </small>
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="word-choices" aria-label="Word drills">
              {wordDrills.map((w) => (
                <button
                  key={w}
                  className={word === w ? "selected" : ""}
                  aria-pressed={word === w}
                  onClick={() => chooseWord(w)}
                >
                  {w === demoPhrase ? "Demo: Hi, this is Common" : w}
                </button>
              ))}
            </div>
            <div className="word-sequence" aria-label={`Fingerspell ${word}`}>
              {sequence.map((l, i) => (
                <span
                  key={i}
                  className={
                    i < wordIndex ? "done" : i === wordIndex ? "current" : ""
                  }
                >
                  {l}
                </span>
              ))}
              <small>
                {wordDone
                  ? "Complete"
                  : `${wordIndex} / ${sequence.length} letters`}
              </small>
            </div>
          </>
        )}
      </div>
      <div className="studio-body">
        <div className="camera-column">
          <div className="camera-view">
            <div
              className={`camera-media ${mirrored ? "mirrored" : ""} ${active ? "visible" : ""}`}
            >
              <video
                ref={camera.video}
                autoPlay
                muted
                playsInline
                aria-label="Live camera preview"
              />
              <canvas
                ref={camera.canvas}
                width={640}
                height={480}
                aria-hidden="true"
              />
            </div>
            {!active && (
              <div className="camera-idle">
                <span className="camera-outline">
                  <Hand size={64} strokeWidth={1} />
                </span>
                <h2>
                  {loading
                    ? "Preparing your camera…"
                    : "Your hands have something to say."}
                </h2>
                <p>
                  {loading
                    ? "Allow camera access to start tracking."
                    : "One camera. A place to learn, and a space to be understood."}
                </p>
                <button
                  className="primary-button"
                  onClick={loading ? camera.stop : () => void camera.start()}
                >
                  {loading ? <CameraOff size={16} /> : <Camera size={16} />}
                  {loading ? "Cancel loading" : "Turn on camera"}
                </button>
              </div>
            )}
            <div className="view-topline">
              <span className="view-status">
                <span className={`status-dot ${active ? "live" : ""}`} />
                {active ? "CAMERA ON" : "CAMERA OFF"}
              </span>
              <button
                className="view-mirror"
                aria-pressed={mirrored}
                onClick={() => setMirrored(!mirrored)}
              >
                <FlipHorizontal2 size={15} />
                {mirrored ? "Mirrored" : "Unmirrored"}
              </button>
            </div>
            {active && (
              <div className="live-letter">
                <span>READING</span>
                <strong>{detected || "—"}</strong>
                <small>
                  {detected
                    ? "Hold steady to capture"
                    : "Waiting for a clear handshape"}
                </small>
              </div>
            )}
          </div>
          <div
            className={`detection-status ${success ? "success" : ""}`}
            role="status"
          >
            {success ? <CheckCircle2 size={21} /> : <ScanLine size={21} />}
            <div>
              <strong>
                {recording
                  ? `Recording ${target}…`
                  : success
                    ? drill === "words"
                      ? "Phrase complete."
                      : `${target} handshape matched.`
                    : feedback}
              </strong>
              <span>
                {recording
                  ? "Keep the shape still for 16 clear frames."
                  : drill === "words"
                    ? "Repeated letters need a brief hand-lowering pause."
                    : "Hold a match for one second. Either hand is supported."}
              </span>
            </div>
            {success && drill === "letters" && (
              <button
                className="text-button"
                onClick={() => chooseLetter(next)}
              >
                Next <ArrowRight size={15} />
              </button>
            )}
          </div>
          <div
            className="hold-track"
            role="progressbar"
            aria-label={
              recording ? "Personal example recording" : "Stable handshape hold"
            }
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(
              (recording ? recordProgress : progress) * 100,
            )}
          >
            <span
              style={{
                width: `${(recording ? recordProgress : progress) * 100}%`,
              }}
            />
          </div>
          {camera.message && (
            <p className="notice error" role="alert">
              {camera.message}
            </p>
          )}
          <div className="camera-bottom">
            <span>
              <ShieldCheck size={14} />
              No video is saved or uploaded
            </span>
            {(active || loading) && (
              <button
                className="text-button"
                onClick={() => {
                  camera.stop();
                  resetTracking();
                }}
              >
                Stop camera <CameraOff size={15} />
              </button>
            )}
          </div>
        </div>
        <section className="sign-composer" aria-labelledby="sign-text-title">
          <div className="composer-heading">
            <div>
              <span className="eyebrow">FROM YOUR HANDS TO THE PAGE</span>
              <h2 id="sign-text-title">
                Sign to text
                <span className="feature-label">Fingerspelling</span>
              </h2>
            </div>
            <label className="capture-switch">
              <span>{captureEnabled ? "Capture on" : "Capture paused"}</span>
              <button
                className="toggle"
                role="switch"
                aria-label="Capture recognized letters as text"
                aria-checked={captureEnabled}
                onClick={() => {
                  setCaptureEnabled(!captureEnabled);
                  capture.current.reset();
                }}
              >
                <span />
              </button>
            </label>
          </div>
          <label className="sr-only" htmlFor="signed-text">
            Recognized sign text
          </label>
          <textarea
            id="signed-text"
            value={text}
            readOnly={drill === "words"}
            maxLength={2000}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              drill === "words"
                ? "Your guided phrase appears here as each letter matches…"
                : "Hold a supported letter. We’ll give it a little space here…"
            }
          />
          <div className="sign-text-actions">
            <div>
              {drill === "letters" && (
                <>
                  <button
                    className="text-button"
                    onClick={() => setText((old) => (old + " ").slice(0, 2000))}
                  >
                    <Space size={15} />
                    Space
                  </button>
                  <button
                    className="text-button"
                    disabled={!text}
                    onClick={() => setText((old) => old.slice(0, -1))}
                  >
                    <Delete size={15} />
                    Undo
                  </button>
                </>
              )}
              <button
                className="text-button muted"
                disabled={!text}
                onClick={() => {
                  setText("");
                  capture.current.reset();
                  if (drill === "words") {
                    setWordIndex(0);
                    setWordDone(false);
                    setSuccess(false);
                  }
                }}
              >
                Clear
              </button>
            </div>
            <div>
              <button
                className="text-button"
                disabled={!text}
                onClick={() => void copy()}
              >
                <Copy size={15} />
                Copy
              </button>
              <button
                className="secondary-button"
                disabled={!text}
                onClick={speak}
              >
                <Volume2 size={16} />
                Speak text
              </button>
            </div>
          </div>
          <p className="composer-explanation">
            {drill === "words"
              ? "Guided drill: only the next matching letter advances the phrase."
              : "Free capture: supported letters appear after a steady hold. Lower your hand for 300ms to repeat a letter."}{" "}
            Uncertain shapes are left blank.
          </p>
          {notice && (
            <p className="notice" role="status">
              {notice}
            </p>
          )}
        </section>
        <aside className="training-panel" aria-label="Sign trainer">
          <div className="training-heading">
            <span className="eyebrow">
              {setupIndex !== null
                ? `DEMO SETUP · ${setupIndex + 1} / ${demoLetters.length}`
                : "YOUR NEXT HANDSHAPE"}
            </span>
            <span className="target-letter">{target}</span>
          </div>
          <div className="training-reference">
            <HandDiagram letter={target} />
            <span>Simplified reference · either hand</span>
          </div>
          <h2>{lessons[target].title}</h2>
          <p>{lessons[target].instruction}</p>
          <div className="trainer-tip">
            <Lightbulb size={17} />
            <span>{lessons[target].tip}</span>
          </div>
          <div className="personal-setup">
            <div>
              <strong>
                {profiles[target]
                  ? "Personal example saved"
                  : personalLetters.includes(target)
                    ? "Personal setup needed"
                    : "Make it more personal"}
              </strong>
              <span>
                {profiles[target]
                  ? "Re-record if lighting or camera position changes."
                  : "Record your own shape for a closer match."}
              </span>
            </div>
            <button
              className="secondary-button"
              disabled={!active}
              onClick={
                recording
                  ? () => {
                      recordingRef.current = null;
                      setRecording(false);
                      setRecordProgress(0);
                    }
                  : record
              }
            >
              {recording
                ? "Cancel recording"
                : profiles[target]
                  ? "Re-record letter"
                  : `Record ${target}`}
            </button>
            {setupNeeded.length > 0 && (
              <small>
                For C, M, N, O, S, T: set up all six to distinguish similar
                shapes. {6 - setupNeeded.length}/6 ready.
              </small>
            )}
          </div>
          <button
            className="text-button demo-setup-button"
            onClick={startSetup}
          >
            <RotateCcw size={14} />
            Set up the demo phrase
          </button>
          <a
            className="reference-link"
            href="https://www.lifeprint.com/asl101/fingerspelling/abc.htm"
            target="_blank"
            rel="noreferrer"
          >
            ASL University reference <ExternalLink size={13} />
          </a>
        </aside>
      </div>
      <footer className="studio-footer">
        <span>
          {completed.length}/{letters.length} letters practiced ·{" "}
          {Object.keys(profiles).length} personal examples
        </span>
        <button
          className="text-button"
          onClick={() => {
            setProfiles({});
            resetTracking();
            setNotice("Personal examples removed from this device.");
          }}
        >
          Delete personal examples
        </button>
        <p>
          Experimental handshape matching, not full ASL translation. Personal
          pose examples stay in this browser. No emotion or fluency assessment.
        </p>
      </footer>
    </section>
  );
}
