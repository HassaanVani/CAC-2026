import { describe, it, expect } from "vitest";
import {
  demoPhrase,
  LetterCapture,
  phrasePrefix,
  spellingOf,
  wordDrills,
} from "../lib/fingerspelling";
import { letters } from "../lib/handshape";
describe("fingerspelling capture", () => {
  it("requires a stable dwell and never repeats a held letter", () => {
    const c = new LetterCapture();
    expect(c.update("M", 0).letter).toBeNull();
    expect(c.update("M", 900).letter).toBe("M");
    expect(c.update("M", 3000).letter).toBeNull();
    expect(c.update("M", 3000).repeat).toBe(true);
  });
  it("requires a neutral gap before the second M in COMMON", () => {
    const c = new LetterCapture();
    c.update("M", 0);
    c.update("M", 900);
    c.update(null, 1000);
    c.update(null, 1100);
    expect(c.update("M", 1200).letter).toBeNull();
    c.update(null, 1300);
    c.update(null, 1650);
    expect(c.update("M", 1700).letter).toBeNull();
    expect(c.update("M", 2600).letter).toBe("M");
  });
  it("resets a candidate when a different or unknown shape appears", () => {
    const c = new LetterCapture();
    c.update("H", 0);
    c.update("I", 500);
    expect(c.update("I", 1000).letter).toBeNull();
    c.update(null, 1200);
    c.update("I", 1400);
    expect(c.update("I", 2000).letter).toBeNull();
    expect(c.update("I", 2300).letter).toBe("I");
  });
  it("uses only supported letters in every drill, including the exact demo phrase", () => {
    for (const word of wordDrills)
      for (const letter of spellingOf(word)) expect(letters).toContain(letter);
    expect(spellingOf(demoPhrase).join("")).toBe("HITHISISCOMMON");
  });
  it("formats only the recognized prefix, never inserts unrecognized future letters", () => {
    expect(phrasePrefix(demoPhrase, 0)).toBe("");
    expect(phrasePrefix(demoPhrase, 1)).toBe("H");
    expect(phrasePrefix(demoPhrase, 2)).toBe("Hi,");
    expect(phrasePrefix(demoPhrase, 6)).toBe("Hi, this");
    expect(phrasePrefix(demoPhrase, 14)).toBe(demoPhrase);
  });
});
