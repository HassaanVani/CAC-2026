import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SpeechSession, speechSupported } from "../lib/speech";
class FakeRecognition {
  static instances: FakeRecognition[] = [];
  continuous = false;
  interimResults = false;
  lang = "";
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onresult:
    | ((e: {
        resultIndex: number;
        results: Record<
          number,
          { isFinal: boolean; 0: { transcript: string } }
        > & { length: number };
      }) => void)
    | null = null;
  start = vi.fn();
  abort = vi.fn();
  constructor() {
    FakeRecognition.instances.push(this);
  }
}
const callbacks = () => ({ state: vi.fn(), interim: vi.fn(), final: vi.fn() });
beforeEach(() => {
  FakeRecognition.instances = [];
  vi.stubGlobal("window", { webkitSpeechRecognition: FakeRecognition });
});
afterEach(() => vi.unstubAllGlobals());
describe("speech session boundaries", () => {
  it("detects unsupported browsers and provides a typed-reply fallback message", () => {
    vi.stubGlobal("window", {});
    expect(speechSupported()).toBe(false);
    const cb = callbacks();
    new SpeechSession(cb).start();
    expect(cb.state).toHaveBeenLastCalledWith(
      "error",
      expect.stringContaining("type replies"),
    );
  });
  it("keeps interim text separate and emits stable IDs for final results", () => {
    const cb = callbacks();
    const session = new SpeechSession(cb);
    session.start();
    const rec = FakeRecognition.instances[0];
    expect(rec.continuous).toBe(true);
    expect(rec.lang).toBe("en-US");
    rec.onstart?.();
    expect(cb.state).toHaveBeenLastCalledWith("active");
    rec.onresult?.({
      resultIndex: 0,
      results: {
        length: 2,
        0: { isFinal: true, 0: { transcript: " Hello " } },
        1: { isFinal: false, 0: { transcript: "more words" } },
      },
    });
    expect(cb.final).toHaveBeenCalledWith("Hello", expect.any(String));
    expect(cb.interim).toHaveBeenLastCalledWith("more words");
  });
  it("ignores late results after stop or a replacement session", () => {
    const cb = callbacks();
    const session = new SpeechSession(cb);
    session.start();
    const rec = FakeRecognition.instances[0];
    session.stop();
    expect(rec.abort).toHaveBeenCalled();
    rec.onresult?.({
      resultIndex: 0,
      results: { length: 1, 0: { isFinal: true, 0: { transcript: "late" } } },
    });
    expect(cb.final).not.toHaveBeenCalled();
    session.start();
    rec.onerror?.({ error: "network" });
    expect(cb.state).toHaveBeenLastCalledWith("loading");
  });
  it("retains permission errors when the browser subsequently ends the session", () => {
    const cb = callbacks();
    new SpeechSession(cb).start();
    const rec = FakeRecognition.instances[0];
    rec.onerror?.({ error: "not-allowed" });
    rec.onend?.();
    expect(cb.state).toHaveBeenLastCalledWith(
      "error",
      expect.stringContaining("blocked"),
    );
  });
  it("provides explicit recovery when the service ends unexpectedly", () => {
    const cb = callbacks();
    new SpeechSession(cb).start();
    FakeRecognition.instances[0].onend?.();
    expect(cb.state).toHaveBeenLastCalledWith(
      "idle",
      expect.stringContaining("Start again"),
    );
  });
});
