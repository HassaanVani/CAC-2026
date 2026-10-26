import { describe, expect, it } from "vitest";
import {
  emptyTranscript,
  exportTranscript,
  sampleEntries,
  transcriptReducer,
} from "../lib/transcript";
describe("transcript lifecycle", () => {
  const partner = {
    id: "1",
    speaker: "partner" as const,
    text: "Hello there",
    time: 1000,
  };
  it("replaces interim speech with a final entry and ignores duplicate final events", () => {
    let state = transcriptReducer(emptyTranscript, {
      type: "interim",
      text: "Hello",
    });
    expect(state.entries).toHaveLength(0);
    state = transcriptReducer(state, { type: "append", entry: partner });
    expect(state.interim).toBe("");
    expect(state.entries).toEqual([partner]);
    expect(transcriptReducer(state, { type: "append", entry: partner })).toBe(
      state,
    );
  });
  it("keeps incoming interim speech when a typed reply is added", () => {
    const state = transcriptReducer(
      { ...emptyTranscript, interim: "Speaking" },
      { type: "append", entry: { ...partner, speaker: "you" } },
    );
    expect(state.interim).toBe("Speaking");
  });
  it("replaces illustrative content when real conversation begins", () => {
    const sample = transcriptReducer(emptyTranscript, {
      type: "sample",
      entries: sampleEntries(),
    });
    expect(exportTranscript(sample)).toContain("SAMPLE CONVERSATION");
    const state = transcriptReducer(sample, { type: "append", entry: partner });
    expect(state.sample).toBe(false);
    expect(state.entries).toEqual([partner]);
    expect(exportTranscript(state)).not.toContain("SAMPLE CONVERSATION");
  });
  it("clears both live and sample contents and rejects blank entries", () => {
    expect(
      transcriptReducer(emptyTranscript, {
        type: "append",
        entry: { ...partner, text: "  " },
      }),
    ).toBe(emptyTranscript);
    expect(
      transcriptReducer(
        { entries: [partner], interim: "more", sample: false },
        { type: "clear" },
      ),
    ).toEqual(emptyTranscript);
  });
  it("exports participant labels and Unicode without interim text", () => {
    const output = exportTranscript({
      entries: [{ ...partner, text: "It’s yours." }],
      interim: "not final",
      sample: false,
    });
    expect(output).toContain("Partner\nIt’s yours.");
    expect(output).not.toContain("not final");
  });
});
