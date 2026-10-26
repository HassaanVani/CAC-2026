import { describe, expect, it } from "vitest";
import {
  personalPrediction,
  poseDistance,
  poseVector,
  readProfiles,
  type Profiles,
} from "../lib/calibration";
import { personalLetters } from "../lib/handshape";
import { fixture } from "./fixtures";
const row = (n: number) => Array.from({ length: 61 }, () => n);
const samples = (n: number) => Array.from({ length: 16 }, () => row(n));
describe("local personal examples", () => {
  it("normalizes scale, position, and mirror while retaining orientation", () => {
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
    expect(base).toHaveLength(61);
    expect(poseDistance(base, mirrored)).toBeLessThan(1e-8);
    expect(poseDistance(base, smaller)).toBeLessThan(1e-8);
    expect(poseVector([])).toBeNull();
  });
  it("validates persisted vectors and rejects malformed or non-finite examples", () => {
    expect(
      readProfiles({
        I: samples(0.1),
        M: [[NaN]],
        N: [],
        garbage: samples(0.2),
      }),
    ).toEqual({ I: samples(0.1) });
    expect(readProfiles({ I: samples(Infinity) })).toEqual({});
    expect(readProfiles(null)).toEqual({});
  });
  it("requires the full ambiguous letter group before recognizing any of its shapes", () => {
    const profile: Profiles = { M: samples(0.1) };
    expect(personalPrediction(row(0.1), profile)).toBeNull();
    personalLetters.forEach((l, i) => (profile[l] = samples(i * 0.3)));
    expect(personalPrediction(row(0.6), profile)).toBe("N");
  });
  it("rejects ambiguous and distant matches instead of forcing a prediction", () => {
    expect(
      personalPrediction(row(0.1), { I: samples(0.1), H: samples(0.1) }),
    ).toBeNull();
    expect(personalPrediction(row(2), { I: samples(0.1) })).toBeNull();
    expect(
      personalPrediction(row(0.11), { I: samples(0.1), H: samples(0.5) }),
    ).toBe("I");
  });
});
