import type { DeviceState } from "./speech";
export type AudioReading = { level: number; label: string };
export class AudioMeter {
  private stream?: MediaStream;
  private context?: AudioContext;
  private frame = 0;
  private generation = 0;
  constructor(
    private onState: (state: DeviceState, message?: string) => void,
    private onReading: (value: AudioReading) => void,
  ) {}
  async start() {
    this.stop();
    const generation = ++this.generation;
    this.onState("loading");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (generation !== this.generation) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      this.stream = stream;
      stream.getTracks().forEach((track) => {
        track.onended = () => {
          if (generation === this.generation) {
            this.stop();
            this.onState(
              "error",
              "The microphone disconnected. Connect it and enable voice cues again.",
            );
          }
        };
      });
      this.context = new AudioContext();
      await this.context.resume();
      if (generation !== this.generation || !this.context) return;
      const analyser = this.context.createAnalyser();
      analyser.fftSize = 1024;
      this.context.createMediaStreamSource(stream).connect(analyser);
      const data = new Float32Array(analyser.fftSize);
      let smooth = 0;
      const update = () => {
        analyser.getFloatTimeDomainData(data);
        const rms = Math.sqrt(
          data.reduce((sum, v) => sum + v * v, 0) / data.length,
        );
        smooth = smooth * 0.75 + Math.min(1, rms * 6) * 0.25;
        this.onReading({
          level: smooth,
          label:
            smooth < 0.04 ? "Quiet" : smooth < 0.35 ? "Moderate" : "Louder",
        });
        this.frame = requestAnimationFrame(update);
      };
      this.onState("active");
      update();
    } catch {
      if (generation !== this.generation) return;
      this.stop();
      this.onState(
        "error",
        "Voice cues need microphone access. Allow access and try again.",
      );
    }
  }
  stop() {
    this.generation++;
    cancelAnimationFrame(this.frame);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = undefined;
    void this.context?.close();
    this.context = undefined;
    this.onReading({ level: 0, label: "Quiet" });
    this.onState("idle");
  }
}
export function estimatePace(
  samples: { text: string; time: number }[],
  now: number,
  started: number,
): number | null {
  const elapsed = (now - Math.max(started, now - 30000)) / 1000;
  if (elapsed < 8) return null;
  const recent = samples.filter((s) => s.time >= now - 30000);
  if (!recent.length) return null;
  const words = recent.reduce(
    (n, s) => n + s.text.trim().split(/\s+/).filter(Boolean).length,
    0,
  );
  return Math.round((words / elapsed) * 60);
}
