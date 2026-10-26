import { describe, expect, it } from "vitest";
import {
  letters,
  lessons,
  matchHandshape,
  StableHold,
  recognizeLetter,
  type Letter,
  type Point,
} from "../lib/handshape";
// Synthetic landmark geometry tests rule behavior, not real-world ASL accuracy.
function fixture(letter: Letter): Point[] {
  const p: Point[] = Array.from({ length: 21 }, () => ({
    x: 0.5,
    y: 0.6,
    z: 0,
  }));
  p[0] = { x: 0.5, y: 0.85, z: 0 };
  [5, 9, 13, 17].forEach((base, i) => {
    const x = [0.38, 0.48, 0.58, 0.68][i];
    p[base] = { x, y: 0.59, z: 0 };
    if (lessons[letter].fingers[i]) {
      const spread =
        letter === "V" || letter === "W"
          ? i === 0
            ? -0.08
            : i === 1
              ? 0.08
              : i === 2
                ? 0.1
                : 0
          : 0;
      p[base + 1] = { x: x + spread * 0.3, y: 0.44, z: 0 };
      p[base + 2] = { x: x + spread * 0.7, y: 0.33, z: 0 };
      p[base + 3] = { x: x + spread, y: 0.23, z: 0 };
    } else {
      p[base + 1] = { x, y: 0.48, z: 0 };
      p[base + 2] = { x, y: 0.57, z: 0.02 };
      p[base + 3] = { x, y: 0.65, z: 0.02 };
    }
  });
  p[1] = { x: 0.35, y: 0.73, z: 0 };
  p[2] = { x: 0.29, y: 0.66, z: 0 };
  if (letter === "L" || letter === "Y") {
    p[3] = { x: 0.22, y: 0.6, z: 0 };
    p[4] = { x: 0.12, y: 0.54, z: 0 };
  } else if (letter === "A") {
    p[3] = { x: 0.31, y: 0.57, z: 0 };
    p[4] = { x: 0.31, y: 0.48, z: 0 };
  } else {
    p[3] = { x: 0.37, y: 0.63, z: 0 };
    p[4] = { x: 0.48, y: 0.65, z: 0 };
  }
  if (letter === "D") p[4] = { ...p[12] };
  if (letter === "F") p[4] = { ...p[8] };
  return p;
}
describe("limited handshape matching", () => {
  for (const letter of letters) {
    it(`recognizes the synthetic ${letter} shape on either hand`, () => {
      const p = fixture(letter);
      expect(matchHandshape(p, letter).match).toBe(true);
      expect(recognizeLetter(p)).toBe(letter);
      expect(
        matchHandshape(
          p.map((v) => ({ ...v, x: 1 - v.x })),
          letter,
        ).match,
      ).toBe(true);
    });
    it(`rejects a different handshape for ${letter}`, () => {
      const other = letter === "A" ? "B" : "A";
      expect(matchHandshape(fixture(other), letter).match).toBe(false);
    });
  }
  it("normalizes matching to palm size", () => {
    expect(
      matchHandshape(
        fixture("L").map((p) => ({
          x: 0.5 + (p.x - 0.5) * 0.7,
          y: 0.5 + (p.y - 0.5) * 0.7,
          z: p.z * 0.7,
        })),
        "L",
      ).match,
    ).toBe(true);
  });
  it("rejects absent, malformed, clipped and distant hands", () => {
    expect(matchHandshape([], "A").match).toBe(false);
    const p = fixture("A");
    p[4].x = NaN;
    expect(matchHandshape(p, "A").match).toBe(false);
    const clipped = fixture("L");
    clipped[4].x = 0;
    expect(matchHandshape(clipped, "L").message).toContain("frame");
    expect(
      matchHandshape(
        fixture("A").map((p) => ({
          x: 0.5 + (p.x - 0.5) * 0.1,
          y: 0.5 + (p.y - 0.5) * 0.1,
          z: p.z * 0.1,
        })),
        "A",
      ).message,
    ).toContain("closer");
  });
  it("does not accept a closed thumb for L or unspread V", () => {
    const l = fixture("L");
    l[4] = { x: 0.48, y: 0.65, z: 0 };
    expect(matchHandshape(l, "L").match).toBe(false);
    const v = fixture("V");
    v[8].x = 0.46;
    v[12].x = 0.49;
    expect(matchHandshape(v, "V").match).toBe(false);
  });
});
describe("stable one-second hold", () => {
  it("requires a continuous match and resets on a lost hand", () => {
    const hold = new StableHold();
    expect(hold.update(true, 0)).toBe(0);
    expect(hold.update(true, 600)).toBe(0.6);
    expect(hold.update(false, 700)).toBe(0);
    expect(hold.update(true, 1000)).toBe(0);
    expect(hold.update(true, 2000)).toBe(1);
    hold.reset();
    expect(hold.update(true, 2100)).toBe(0);
  });
});
