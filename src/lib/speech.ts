export type DeviceState = "idle" | "loading" | "active" | "error";
type RecognitionEvent = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: { transcript: string };
    };
  };
};
type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onresult: ((e: RecognitionEvent) => void) | null;
  start(): void;
  abort(): void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};
export const speechSupported = () =>
  Boolean(
    (window as SpeechWindow).SpeechRecognition ||
    (window as SpeechWindow).webkitSpeechRecognition,
  );
const errors: Record<string, string> = {
  "not-allowed":
    "Microphone access was blocked. Allow it in your browser’s site settings, then try again.",
  "service-not-allowed":
    "Speech recognition is unavailable in this browser. Try desktop Chrome, or type your reply below.",
  "audio-capture": "No microphone was found. Connect one and try again.",
  network:
    "Speech recognition could not connect. Check your internet connection and try again.",
  "no-speech": "No speech was heard. Try again when you’re ready.",
};
export class SpeechSession {
  private recognition?: Recognition;
  private generation = 0;
  constructor(
    private callbacks: {
      state: (s: DeviceState, message?: string) => void;
      interim: (text: string) => void;
      final: (text: string, id: string) => void;
    },
  ) {}
  start() {
    this.stop();
    const Constructor =
      (window as SpeechWindow).SpeechRecognition ||
      (window as SpeechWindow).webkitSpeechRecognition;
    if (!Constructor) {
      this.callbacks.state(
        "error",
        "Live captions need a supported browser. Open Common in desktop Chrome. You can still type replies.",
      );
      return;
    }
    const recognition = new Constructor();
    const generation = ++this.generation;
    this.recognition = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    let failed = false;
    recognition.onstart = () => {
      if (generation === this.generation) this.callbacks.state("active");
    };
    recognition.onresult = (event) => {
      if (generation !== this.generation) return;
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal)
          this.callbacks.final(
            result[0].transcript.trim(),
            `${generation}-${i}`,
          );
        else interim += result[0].transcript;
      }
      this.callbacks.interim(interim);
    };
    recognition.onerror = (e) => {
      if (generation !== this.generation || e.error === "aborted") return;
      failed = true;
      this.callbacks.interim("");
      this.callbacks.state(
        "error",
        errors[e.error] ||
          "Captions were interrupted. Press Start captions to try again.",
      );
    };
    recognition.onend = () => {
      if (generation !== this.generation) return;
      this.recognition = undefined;
      this.callbacks.interim("");
      if (!failed)
        this.callbacks.state(
          "idle",
          "Caption session ended. Start again to continue.",
        );
    };
    this.callbacks.state("loading");
    try {
      recognition.start();
    } catch {
      this.callbacks.state(
        "error",
        "Could not start captions. Please try again.",
      );
    }
  }
  stop() {
    this.generation++;
    if (this.recognition) {
      this.recognition.onend = null;
      this.recognition.abort();
      this.recognition = undefined;
    }
    this.callbacks.interim("");
    this.callbacks.state("idle");
  }
}
