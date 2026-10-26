import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Camera,
  CameraOff,
  Check,
  CheckCircle2,
  ExternalLink,
  FlipHorizontal2,
  Hand,
  Lightbulb,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import type { HandLandmarker } from "@mediapipe/tasks-vision";
import {
  letters,
  lessons,
  matchHandshape,
  StableHold,
  type Letter,
} from "../lib/handshape";
import type { DeviceState } from "../lib/speech";
import { readStored, saveStored } from "../lib/storage";
import HandDiagram from "./HandDiagram";

export default function Practice() {
  const [letter, setLetter] = useState<Letter>("A");
  const [completed, setCompleted] = useState<Letter[]>(() => {
    const value = readStored<unknown>("common-completed", []);
    return Array.isArray(value) ? letters.filter((l) => value.includes(l)) : [];
  });
  const [state, setState] = useState<DeviceState>("idle");
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState(
    "Show one hand, palm facing the camera.",
  );
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [mirrored, setMirrored] = useState(true);
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const model = useRef<HandLandmarker | null>(null);
  const frame = useRef(0);
  const generation = useRef(0);
  const target = useRef(letter);
  const hold = useRef(new StableHold());
  const matched = useRef(false);
  const connections = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [0, 5],
    [5, 6],
    [6, 7],
    [7, 8],
    [5, 9],
    [9, 10],
    [10, 11],
    [11, 12],
    [9, 13],
    [13, 14],
    [14, 15],
    [15, 16],
    [13, 17],
    [0, 17],
    [17, 18],
    [18, 19],
    [19, 20],
  ];

  function stop() {
    generation.current++;
    cancelAnimationFrame(frame.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    model.current?.close();
    model.current = null;
    if (video.current) video.current.srcObject = null;
    if (canvas.current)
      canvas.current
        .getContext("2d")
        ?.clearRect(0, 0, canvas.current.width, canvas.current.height);
    setState("idle");
    setProgress(0);
    hold.current.reset();
  }
  useEffect(
    () => () => {
      generation.current++;
      cancelAnimationFrame(frame.current);
      stream.current?.getTracks().forEach((t) => t.stop());
      model.current?.close();
    },
    [],
  );
  useEffect(() => {
    saveStored("common-completed", completed);
  }, [completed]);
  function select(value: Letter) {
    target.current = value;
    setLetter(value);
    setSuccess(false);
    matched.current = false;
    setProgress(0);
    hold.current.reset();
    setFeedback("Show one hand, palm facing the camera.");
  }
  async function start() {
    stop();
    const run = ++generation.current;
    setState("loading");
    setMessage("");
    setSuccess(false);
    matched.current = false;
    hold.current.reset();
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error(
          "Camera access requires HTTPS or localhost and a supported browser.",
        );
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false,
      });
      if (run !== generation.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      media.getVideoTracks()[0].onended = () => {
        if (run === generation.current) {
          stop();
          setMessage("The camera disconnected. Reconnect it and try again.");
          setState("error");
        }
      };
      video.current!.srcObject = media;
      await video.current!.play();
      if (canvas.current && video.current) {
        canvas.current.width = video.current.videoWidth;
        canvas.current.height = video.current.videoHeight;
      }
      const { FilesetResolver, HandLandmarker } =
        await import("@mediapipe/tasks-vision");
      const files = await FilesetResolver.forVisionTasks(
        `${import.meta.env.BASE_URL}wasm`,
      );
      if (run !== generation.current) return;
      const detector = await HandLandmarker.createFromOptions(files, {
        baseOptions: {
          modelAssetPath: `${import.meta.env.BASE_URL}models/hand_landmarker.task`,
          delegate: "CPU",
        },
        runningMode: "VIDEO",
        numHands: 2,
        minHandDetectionConfidence: 0.6,
        minHandPresenceConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });
      if (run !== generation.current) {
        detector.close();
        return;
      }
      model.current = detector;
      setState("active");
      let last = 0;
      let lastVideoTime = -1;
      const detect = (now: number) => {
        if (run !== generation.current) return;
        try {
          const element = video.current;
          if (
            element &&
            element.readyState >= 2 &&
            now - last > 100 &&
            element.currentTime !== lastVideoTime
          ) {
            last = now;
            lastVideoTime = element.currentTime;
            const result = detector.detectForVideo(element, now);
            const ctx = canvas.current?.getContext("2d");
            const width = canvas.current?.width || 640;
            const height = canvas.current?.height || 480;
            ctx?.clearRect(0, 0, width, height);
            const points = result.landmarks[0];
            if (ctx && points) {
              ctx.strokeStyle = "#b5e2c1";
              ctx.lineWidth = 2;
              connections.forEach(([a, b]) => {
                ctx.beginPath();
                ctx.moveTo(points[a].x * width, points[a].y * height);
                ctx.lineTo(points[b].x * width, points[b].y * height);
                ctx.stroke();
              });
              ctx.fillStyle = "#fff9eb";
              points.forEach((p) => {
                ctx.beginPath();
                ctx.arc(p.x * width, p.y * height, 3.5, 0, 2 * Math.PI);
                ctx.fill();
              });
            }
            const match =
              result.landmarks.length > 1
                ? { match: false, message: "Keep just one hand in the frame." }
                : points
                  ? matchHandshape(
                      points,
                      target.current,
                      result.worldLandmarks[0],
                    )
                  : {
                      match: false,
                      message: "No hand detected. Raise one hand into view.",
                    };
            if (!matched.current) {
              const value = hold.current.update(match.match, now);
              setProgress(value);
              setFeedback(match.message);
              if (value >= 1) {
                matched.current = true;
                setSuccess(true);
                setFeedback("Handshape held. Nicely done!");
                setCompleted((old) =>
                  old.includes(target.current) ? old : [...old, target.current],
                );
              }
            }
          }
          frame.current = requestAnimationFrame(detect);
        } catch {
          stop();
          setState("error");
          setMessage(
            "Hand tracking was interrupted. Restart the camera to try again.",
          );
        }
      };
      frame.current = requestAnimationFrame(detect);
    } catch (error) {
      if (run !== generation.current) return;
      stop();
      setState("error");
      const name = error instanceof Error ? error.name : "";
      setMessage(
        name === "NotAllowedError"
          ? "Camera permission was blocked. Allow camera access in your browser’s site settings, then try again."
          : name === "NotFoundError"
            ? "No camera was found. Connect a webcam and try again."
            : error instanceof Error && error.message.includes("HTTPS")
              ? error.message
              : "Could not load the camera or hand tracker. Check your camera and reload, then try again.",
      );
    }
  }
  const next = letters[(letters.indexOf(letter) + 1) % letters.length];
  return (
    <div className="practice-layout">
      <section className="practice-main">
        <div className="lesson-selector" aria-label="Choose an ASL letter">
          {letters.map((l, i) => (
            <button
              key={l}
              className={`letter-tab ${letter === l ? "selected" : ""}`}
              aria-pressed={letter === l}
              onClick={() => select(l)}
            >
              <span className="lesson-number">
                {String(i + 1).padStart(2, "0")}
              </span>
              <strong>{l}</strong>
              {completed.includes(l) ? (
                <CheckCircle2 size={16} />
              ) : (
                <span className="lesson-dot" />
              )}
            </button>
          ))}
        </div>
        <section className="camera-card">
          <div className="card-toolbar">
            <span className="eyebrow">
              <span
                className={`status-dot ${state === "active" ? "live" : ""}`}
              />
              {state === "active"
                ? "CAMERA IS ON"
                : state === "loading"
                  ? "PREPARING CAMERA"
                  : "YOUR PRACTICE SPACE"}
            </span>
            <button
              className="text-button"
              onClick={() => setMirrored(!mirrored)}
              aria-pressed={mirrored}
            >
              <FlipHorizontal2 size={15} />
              {mirrored ? "Mirrored" : "Unmirrored"}
            </button>
          </div>
          <div className={`camera-stage ${state === "active" ? "active" : ""}`}>
            <div className={`camera-media ${mirrored ? "mirrored" : ""}`}>
              <video
                ref={video}
                autoPlay
                muted
                playsInline
                aria-label="Live camera preview"
              />
              <canvas
                ref={canvas}
                width={640}
                height={480}
                aria-hidden="true"
              />
            </div>
            {state !== "active" && (
              <div className="camera-placeholder">
                <span className="camera-orbit" aria-hidden="true">
                  <Hand size={56} strokeWidth={1} />
                </span>
                <h2>
                  {state === "loading"
                    ? "Finding your hand…"
                    : "A little practice. A new connection."}
                </h2>
                <p>
                  {state === "loading"
                    ? "Allow camera access while the hand tracker loads."
                    : "Follow the reference, then turn on your camera.\nEither hand is welcome here."}
                </p>
              </div>
            )}
            <div className="camera-corner top-left" />
            <div className="camera-corner bottom-right" />
            {state === "active" && (
              <span className="camera-label">
                <span className="status-dot live" />
                LIVE · PROCESSED ON YOUR DEVICE
              </span>
            )}
          </div>
          <div
            className={`practice-feedback ${success ? "success" : ""}`}
            role="status"
          >
            {success ? <CheckCircle2 size={20} /> : <Hand size={20} />}
            <div>
              <strong>
                {success
                  ? "One more connection made."
                  : state === "active"
                    ? feedback
                    : "Ready when you are."}
              </strong>
              <span>
                {success
                  ? `You held the ${letter} handshape for one second.`
                  : state === "active"
                    ? "Hold the matching shape for one second."
                    : "Your camera only starts when you choose."}
              </span>
            </div>
            {success && (
              <button className="text-button" onClick={() => select(next)}>
                Next letter <ArrowRight size={16} />
              </button>
            )}
          </div>
          <div
            className="hold-track"
            role="progressbar"
            aria-label="One-second stable handshape hold"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
          >
            <span style={{ width: `${progress * 100}%` }} />
          </div>
          {message && (
            <div className="notice error" role="alert">
              {message}
            </div>
          )}
          <div className="caption-controls">
            <button
              className="primary-button"
              onClick={
                state === "active" || state === "loading"
                  ? stop
                  : () => void start()
              }
            >
              {state === "active" || state === "loading" ? (
                <CameraOff size={17} />
              ) : (
                <Camera size={17} />
              )}
              {state === "active"
                ? "Stop camera"
                : state === "loading"
                  ? "Cancel loading"
                  : "Start camera"}
            </button>
            <span className="camera-local">
              <ShieldCheck size={15} />
              Video stays on your device
            </span>
            {success && (
              <button
                className="icon-button"
                aria-label="Practice this letter again"
                onClick={() => select(letter)}
              >
                <RotateCcw size={17} />
              </button>
            )}
          </div>
        </section>
        <p className="practice-disclaimer">
          A starting point, not a fluency test. This tool checks a few handshape
          features. It doesn’t translate ASL or assess signing proficiency.
        </p>
      </section>
      <aside className="lesson-column">
        <section className="reference-card">
          <div className="reference-heading">
            <span className="eyebrow">MEET THE LETTER</span>
            <span className="letter-badge">{letter}</span>
          </div>
          <div className="reference-art">
            <HandDiagram letter={letter} />
            <span className="reference-caption">
              PALM FACING FORWARD · SIMPLIFIED GUIDE
            </span>
          </div>
          <h2>{lessons[letter].title}</h2>
          <p>{lessons[letter].instruction}</p>
          <div className="lesson-tip">
            <Lightbulb size={17} />
            <span>{lessons[letter].tip}</span>
          </div>
          <a
            className="reference-link"
            href="https://www.lifeprint.com/asl101/fingerspelling/abc.htm"
            target="_blank"
            rel="noreferrer"
          >
            See ASL University’s reference <ExternalLink size={13} />
          </a>
        </section>
        <section className="progress-card">
          <div>
            <span className="eyebrow">YOUR SMALL STEPS</span>
            <strong>
              {completed.length} <span>/ {letters.length} letters</span>
            </strong>
          </div>
          <div className="progress-letters">
            {letters.map((l) => (
              <span className={completed.includes(l) ? "complete" : ""} key={l}>
                {completed.includes(l) ? <Check size={14} /> : l}
                <span className="sr-only">
                  {completed.includes(l)
                    ? `${l} completed`
                    : `${l} not completed`}
                </span>
              </span>
            ))}
          </div>
          <p>Progress is saved on this device.</p>
          {completed.length > 0 && (
            <button
              className="text-button muted"
              onClick={() => {
                setCompleted([]);
                select(letter);
              }}
            >
              Reset progress
            </button>
          )}
        </section>
      </aside>
    </div>
  );
}
