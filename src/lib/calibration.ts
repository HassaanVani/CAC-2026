import { palmFrame } from "./palmFrame";
import {
  handQuality,
  letters,
  recognizeLetter,
  type Letter,
  type Point,
} from "./handshape";
export type Profiles = Partial<Record<Letter, number[][]>>;
export const sampleCount = 16;
export const demoLetters: Letter[] = ["H", "I", "T", "S", "C", "O", "M", "N"];
/** Base 61 features remain compatible with existing saved examples. Signed
 * depths are appended, rather than replacing legacy absolute-depth features. */
export function poseVector(image: Point[], world?: Point[]): number[] | null {
  if (handQuality(image)) return null;
  const source =
    world?.length === 21 &&
    world.every((p) => [p.x, p.y, p.z].every(Number.isFinite))
      ? world
      : image;
  const local = palmFrame(source);
  if (!local) return null;
  const vector = local
    .slice(1)
    .flatMap((point) => [point.x, point.y, Math.abs(point.z)]);
  const dx = image[8].x - image[5].x,
    dy = image[8].y - image[5].y;
  vector.push(Math.abs(dx) / Math.max(0.001, Math.hypot(dx, dy)));
  vector.push(...local.slice(1).map((point) => point.z));
  return vector;
}
/** Weight the distinguishing joints, not the shared palm. Curled index-finger
 * orientation is noisy and is relevant only to H/U, never to C/M/N/O/S/T. */
export function poseDistance(a: number[], b: number[], letter?: Letter) {
  if (![61, 81].includes(a.length) || ![61, 81].includes(b.length))
    return Infinity;
  let sum = 0,
    total = 0;
  for (let i = 0; i < 60; i++) {
    const joint = Math.floor(i / 3) + 1,
      axis = i % 3;
    const importance =
      joint === 4
        ? 6
        : joint === 3
          ? 3
          : joint === 2
            ? 1.5
            : [5, 9, 13, 17].includes(joint)
              ? 0.15
              : [8, 12, 16, 20].includes(joint)
                ? 1.6
                : 0.75;
    const weight = importance * (axis === 2 ? 0.3 : 1);
    sum += (a[i] - b[i]) ** 2 * weight;
    total += weight;
  }
  if (letter === "H" || letter === "U") {
    sum += (a[60] - b[60]) ** 2 * 2;
    total += 2;
  }
  if (a.length === 81 && b.length === 81) {
    for (let i = 61; i < 81; i++) {
      const joint = i - 60,
        weight = joint === 4 ? 0.8 : joint === 3 ? 0.5 : 0.15;
      sum += (a[i] - b[i]) ** 2 * weight;
      total += weight;
    }
  }
  return Math.sqrt(sum / total);
}
export function readProfiles(value: unknown): Profiles {
  if (!value || typeof value !== "object") return {};
  const source = value as Record<string, unknown>;
  const result: Profiles = {};
  for (const letter of letters) {
    const samples = source[letter];
    if (
      Array.isArray(samples) &&
      samples.length >= 8 &&
      samples.length <= 64 &&
      samples.every(
        (row) =>
          Array.isArray(row) &&
          [61, 81].includes(row.length) &&
          row.every(
            (n) =>
              typeof n === "number" && Number.isFinite(n) && Math.abs(n) < 20,
          ),
      )
    )
      result[letter] = samples;
  }
  return result;
}
export function personalPrediction(
  vector: number[],
  profiles: Profiles,
): Letter | null {
  const candidates = letters
    .filter((l) => (profiles[l]?.length || 0) >= 8)
    .map((letter) => {
      const distances = profiles[letter]!.map((sample) =>
        poseDistance(vector, sample, letter),
      ).sort((a, b) => a - b);
      return {
        letter,
        distance: distances.slice(0, 3).reduce((sum, n) => sum + n, 0) / 3,
      };
    })
    .sort((a, b) => a.distance - b.distance);
  const first = candidates[0],
    second = candidates[1];
  // Reject far-away or ambiguous examples; never return a forced best guess.
  if (!first || first.distance > 0.16) return null;
  if (
    second &&
    (second.distance < 1e-6 || first.distance / second.distance > 0.85)
  )
    return null;
  return first.letter;
}
export function resolveLetter(
  image: Point[],
  world: Point[] | undefined,
  profiles: Profiles,
): Letter | null {
  const vector = poseVector(image, world);
  if (!vector) return null;
  const geometric = recognizeLetter(image, world);
  // A clearly open/closed aperture should not be stolen by a nearby saved
  // curve. Personal examples can still resolve poses in the uncertain band.
  if (geometric === "C" || geometric === "O") return geometric;
  const personal = personalPrediction(vector, profiles);
  // Every saved letter is usable independently; geometry remains a fallback.
  return personal ?? geometric;
}
