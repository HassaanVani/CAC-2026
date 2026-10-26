import { useCallback, useEffect, useRef, useState } from "react";
import type { HandLandmarker } from "@mediapipe/tasks-vision";
import type { Point } from "../lib/handshape";
import type { DeviceState } from "../lib/speech";
type FrameHandler = (
  image: Point[] | null,
  world: Point[] | undefined,
  now: number,
  count: number,
) => void;
const edges = [
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
export function useHandCamera(onFrame: FrameHandler) {
  const [state, setState] = useState<DeviceState>("idle");
  const [message, setMessage] = useState("");
  const video = useRef<HTMLVideoElement>(null),
    canvas = useRef<HTMLCanvasElement>(null);
  const stream = useRef<MediaStream | null>(null),
    model = useRef<HandLandmarker | null>(null);
  const frame = useRef(0),
    generation = useRef(0),
    handler = useRef(onFrame);
  handler.current = onFrame;
  const dispose = useCallback(() => {
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
  }, []);
  const stop = useCallback(() => {
    dispose();
    setState("idle");
    setMessage("");
    handler.current(null, undefined, performance.now(), 0);
  }, [dispose]);
  useEffect(() => dispose, [dispose]);
  async function start() {
    stop();
    const run = ++generation.current;
    setState("loading");
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error("Camera access needs HTTPS or localhost.");
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
          setState("error");
          setMessage("The camera disconnected. Reconnect it and try again.");
        }
      };
      video.current!.srcObject = media;
      await video.current!.play();
      if (run !== generation.current) return;
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
        minTrackingConfidence: 0.65,
      });
      if (run !== generation.current) {
        detector.close();
        return;
      }
      model.current = detector;
      setState("active");
      let last = 0,
        lastVideo = -1;
      const detect = (now: number) => {
        if (run !== generation.current) return;
        try {
          const element = video.current;
          if (
            element &&
            element.readyState >= 2 &&
            now - last >= 80 &&
            element.currentTime !== lastVideo
          ) {
            last = now;
            lastVideo = element.currentTime;
            const result = detector.detectForVideo(element, now);
            const points = result.landmarks[0];
            const ctx = canvas.current?.getContext("2d"),
              width = canvas.current?.width || 640,
              height = canvas.current?.height || 480;
            ctx?.clearRect(0, 0, width, height);
            if (ctx && points) {
              ctx.strokeStyle = "#c9e9b6";
              ctx.lineWidth = 2;
              edges.forEach(([a, b]) => {
                ctx.beginPath();
                ctx.moveTo(points[a].x * width, points[a].y * height);
                ctx.lineTo(points[b].x * width, points[b].y * height);
                ctx.stroke();
              });
              ctx.fillStyle = "#fffdf3";
              points.forEach((p) => {
                ctx.beginPath();
                ctx.arc(p.x * width, p.y * height, 3, 0, Math.PI * 2);
                ctx.fill();
              });
            }
            handler.current(
              points || null,
              result.worldLandmarks[0],
              now,
              result.landmarks.length,
            );
          }
          frame.current = requestAnimationFrame(detect);
        } catch {
          stop();
          setState("error");
          setMessage(
            "Hand tracking was interrupted. Restart your camera to continue.",
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
          ? "Camera access was blocked. Allow it in your browser’s site settings, then try again."
          : name === "NotFoundError"
            ? "No camera found. Connect a webcam and try again."
            : error instanceof Error && error.message.includes("HTTPS")
              ? error.message
              : "Could not start the camera or hand tracker. Reload and try again.",
      );
    }
  }
  return { video, canvas, state, message, start, stop };
}
