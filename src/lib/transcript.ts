export type Entry = {
  id: string;
  speaker: "partner" | "you";
  text: string;
  time: number;
};
export type Transcript = { entries: Entry[]; interim: string; sample: boolean };
export type TranscriptAction =
  | { type: "interim"; text: string }
  | { type: "append"; entry: Entry }
  | { type: "clear" }
  | { type: "sample"; entries: Entry[] };
export const emptyTranscript: Transcript = {
  entries: [],
  interim: "",
  sample: false,
};
export function transcriptReducer(
  state: Transcript,
  action: TranscriptAction,
): Transcript {
  switch (action.type) {
    case "interim":
      return { ...state, interim: action.text };
    case "clear":
      return emptyTranscript;
    case "sample":
      return { entries: action.entries, interim: "", sample: true };
    case "append": {
      if (
        !action.entry.text.trim() ||
        state.entries.some((e) => e.id === action.entry.id)
      )
        return state;
      return {
        entries: state.sample
          ? [action.entry]
          : [...state.entries, action.entry],
        interim: action.entry.speaker === "partner" ? "" : state.interim,
        sample: false,
      };
    }
  }
}
export function exportTranscript(state: Transcript) {
  return [
    "COMMON · CONVERSATION",
    state.sample
      ? "SAMPLE CONVERSATION — illustrative content"
      : "Live session",
    "",
    ...state.entries.map(
      (e) =>
        `${new Date(e.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · ${e.speaker === "you" ? "You" : "Partner"}\n${e.text}\n`,
    ),
  ].join("\n");
}
export function sampleEntries(): Entry[] {
  const now = Date.now();
  return [
    { speaker: "partner", text: "Hi! Is this seat taken?", time: now - 90000 },
    {
      speaker: "you",
      text: "It’s all yours. I’m using live captions to follow our conversation.",
      time: now - 60000,
    },
    {
      speaker: "partner",
      text: "Of course. Let me know if you’d like me to slow down.",
      time: now - 30000,
    },
  ].map((e, i) => ({ ...e, id: `sample-${i}` })) as Entry[];
}
