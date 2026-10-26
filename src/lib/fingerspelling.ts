import type { Letter } from "./handshape";
export const demoPhrase = "Hi, this is Common";
export const wordDrills = ["DAD", "DAY", "WILL", "LILY", demoPhrase] as const;
export function spellingOf(text: string): Letter[] {
  return text
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .split("") as Letter[];
}
/** One dwell emits one letter. A repeated letter needs a 300ms neutral gap. */
export class LetterCapture {
  private candidate: Letter | null = null;
  private since: number | null = null;
  private latched: Letter | null = null;
  private absentSince: number | null = null;
  update(
    letter: Letter | null,
    now: number,
  ): { letter: Letter | null; progress: number; repeat: boolean } {
    if (!letter) {
      this.candidate = null;
      this.since = null;
      this.absentSince ??= now;
      if (now - this.absentSince >= 300) this.latched = null;
      return { letter: null, progress: 0, repeat: false };
    }
    this.absentSince = null;
    if (letter === this.latched)
      return { letter: null, progress: 1, repeat: true };
    if (letter !== this.candidate) {
      this.candidate = letter;
      this.since = now;
    }
    const progress = Math.min(1, (now - this.since!) / 900);
    if (progress === 1) {
      this.latched = letter;
      this.candidate = null;
      this.since = null;
      return { letter, progress, repeat: false };
    }
    return { letter: null, progress, repeat: false };
  }
  reset() {
    this.candidate = null;
    this.since = null;
    this.latched = null;
    this.absentSince = null;
  }
}
export function phrasePrefix(phrase: string, count: number): string {
  if (count <= 0) return "";
  let seen = 0,
    end = 0;
  for (let i = 0; i < phrase.length; i++) {
    if (/[a-z]/i.test(phrase[i])) {
      if (seen === count) break;
      seen++;
    }
    end = i + 1;
  }
  return phrase.slice(0, end).trimEnd();
}
