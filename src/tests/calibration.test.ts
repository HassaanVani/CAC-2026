import { describe, expect, it } from "vitest";
import {
  personalPrediction,
  poseDistance,
  poseVector,
  readProfiles,
  resolveLetter,
  type Profiles,
} from "../lib/calibration";
import { fixture } from "./fixtures";
const row = (n: number) => Array.from({ length: 61 }, () => n);
const samples = (n: number) => Array.from({ length: 16 }, () => row(n));
const copies = (v: number[]) => Array.from({ length: 16 }, () => [...v]);
describe("local personal examples", () => {
  it("normalizes scale, position, and mirror while preserving signed depth", () => {
    const p = fixture("L"),
      base = poseVector(p)!;
    const mirrored = poseVector(p.map((v) => ({ ...v, x: 1 - v.x })))!;
    const smaller = poseVector(
      p.map((v) => ({
        x: 0.5 + (v.x - 0.5) * 0.8,
        y: 0.5 + (v.y - 0.5) * 0.8,
        z: v.z * 0.8,
      })),
    )!;
    expect(base).toHaveLength(81);
    expect(poseDistance(base, mirrored)).toBeLessThan(1e-8);
    expect(poseDistance(base, smaller)).toBeLessThan(1e-8);
    expect(poseVector([])).toBeNull();
  });
  it("retains existing 61-value profiles and accepts new signed-depth samples", () => {
    const current = poseVector(fixture("L"))!;
    expect(
      readProfiles({
        I: samples(0.1),
        L: copies(current),
        M: [[NaN]],
        N: [],
        garbage: samples(0.2),
      }),
    ).toEqual({ I: samples(0.1), L: copies(current) });
    expect(poseDistance(current, current.slice(0, 61))).toBe(0);
    expect(readProfiles({ I: samples(Infinity) })).toEqual({});
    expect(readProfiles(null)).toEqual({});
    expect(
      readProfiles({ M: Array.from({ length: 64 }, () => row(0.2)) }).M,
    ).toHaveLength(64);
  });
  for (const letter of ["C", "M", "N", "O", "S", "T"] as const) {
    it(`recognizes a recorded ${letter} immediately without five unrelated profiles`, () => {
      expect(personalPrediction(row(0.1), { [letter]: samples(0.1) })).toBe(
        letter,
      );
    });
  }
  it("recognizes an exact saved match even if the runner-up is less than .009 away", () => {
    const m = row(0.1),
      n = [...m];
    n[9] += 0.01;
    expect(poseDistance(m, n, "M")).toBeLessThan(0.009);
    expect(personalPrediction(m, { M: copies(m), N: copies(n) })).toBe("M");
  });
  it("still rejects indistinguishable profiles and relatively ambiguous live poses", () => {
    expect(
      personalPrediction(row(0.1), { M: samples(0.1), N: samples(0.1) }),
    ).toBeNull();
    expect(
      personalPrediction(row(0.12), { M: samples(0.1), N: samples(0.14) }),
    ).toBeNull();
    expect(personalPrediction(row(2), { I: samples(0.1) })).toBeNull();
  });
  it("ignores curled index orientation jitter, but retains the H/U orientation cue", () => {
    const a = row(0.1),
      b = [...a];
    a[60] = 0;
    b[60] = 1;
    expect(poseDistance(a, b, "M")).toBe(0);
    expect(poseDistance(a, b, "C")).toBe(0);
    expect(poseDistance(a, b, "H")).toBeGreaterThan(0.1);
    expect(personalPrediction(b, { M: copies(a) })).toBe("M");
  });
  it("gives thumb position more influence than the shared palm landmarks", () => {
    const base = row(0.1),
      thumb = [...base],
      palm = [...base];
    thumb[9] += 0.2;
    palm[12] += 0.2;
    expect(poseDistance(base, thumb)).toBeGreaterThan(
      poseDistance(base, palm) * 4,
    );
  });
  it("uses front/back depth to distinguish samples that legacy absolute depth collapsed", () => {
    const p = fixture("A"),
      q = fixture("A");
    p[4].z = 0.05;
    q[4].z = -0.05;
    const front = poseVector(p)!,
      back = poseVector(q)!;
    expect(front.slice(0, 61)).toEqual(back.slice(0, 61));
    const profiles: Profiles = { M: copies(front), N: copies(back) };
    expect(personalPrediction(front, profiles)).toBe("M");
    expect(personalPrediction(back, profiles)).toBe("N");
  });
  it("reads back an actual recorded pose through the full resolver with legacy or new samples", () => {
    const p = fixture("A"),
      v = poseVector(p)!;
    expect(resolveLetter(p, undefined, { M: copies(v.slice(0, 61)) })).toBe(
      "M",
    );
    expect(resolveLetter(p, undefined, { M: copies(v) })).toBe("M");
  });
  it("keeps a clear O aperture from being stolen by a nearby saved C example", () => {
    const p = fixture("O");
    const v = poseVector(p)!;
    expect(resolveLetter(p, undefined, { C: copies(v) })).toBe("O");
  });
});
