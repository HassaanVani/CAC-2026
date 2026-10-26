import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AudioMeter } from "../lib/audio";
const stop = vi.fn();
const close = vi.fn(() => Promise.resolve());
class FakeAudioContext {
  resume = () => Promise.resolve();
  close = close;
  createAnalyser = () => ({
    fftSize: 1024,
    getFloatTimeDomainData: (buffer: Float32Array) => buffer.fill(0.02),
  });
  createMediaStreamSource = () => ({ connect: vi.fn() });
}
beforeEach(() => {
  stop.mockClear();
  close.mockClear();
  vi.stubGlobal("AudioContext", FakeAudioContext);
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn(() => 1),
  );
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});
afterEach(() => vi.unstubAllGlobals());
it("releases microphone and context on stop", async () => {
  vi.stubGlobal("navigator", {
    mediaDevices: {
      getUserMedia: () => Promise.resolve({ getTracks: () => [{ stop }] }),
    },
  });
  const state = vi.fn();
  const reading = vi.fn();
  const meter = new AudioMeter(state, reading);
  await meter.start();
  expect(state).toHaveBeenLastCalledWith("active");
  expect(reading).toHaveBeenLastCalledWith(
    expect.objectContaining({ label: "Quiet" }),
  );
  meter.stop();
  expect(stop).toHaveBeenCalledOnce();
  expect(close).toHaveBeenCalledOnce();
  expect(state).toHaveBeenLastCalledWith("idle");
});
it("releases a late permission grant after the user has cancelled", async () => {
  let resolve!: (stream: { getTracks: () => { stop: typeof stop }[] }) => void;
  vi.stubGlobal("navigator", {
    mediaDevices: {
      getUserMedia: () =>
        new Promise((r) => {
          resolve = r;
        }),
    },
  });
  const state = vi.fn();
  const meter = new AudioMeter(state, vi.fn());
  const pending = meter.start();
  meter.stop();
  resolve({ getTracks: () => [{ stop }] });
  await pending;
  expect(stop).toHaveBeenCalledOnce();
  expect(state).not.toHaveBeenCalledWith("active");
});
it("gives recoverable permission feedback", async () => {
  vi.stubGlobal("navigator", {
    mediaDevices: { getUserMedia: () => Promise.reject(new Error("blocked")) },
  });
  const state = vi.fn();
  await new AudioMeter(state, vi.fn()).start();
  expect(state).toHaveBeenLastCalledWith(
    "error",
    expect.stringContaining("microphone access"),
  );
});
