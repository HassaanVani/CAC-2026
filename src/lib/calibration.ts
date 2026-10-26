import {
  handQuality,
  letters,
  personalLetters,
  recognizeLetter,
  type Letter,
  type Point,
} from "./handshape";
export type Profiles = Partial<Record<Letter, number[][]>>;
export const sampleCount = 16;
export const demoLetters: Letter[] = ["H", "I", "T", "S", "C", "O", "M", "N"];
const dot = (a: number[], b: number[]) =>
  a.reduce((sum, v, i) => sum + v * b[i], 0);
const sub = (a: Point, b: Point) => [a.x - b.x, a.y - b.y, a.z - b.z];
const unit = (v: number[]) => {
  const length = Math.hypot(...v);
  return length > 1e-6 ? v.map((x) => x / length) : null;
};
/** Anatomical palm frame removes position, size, roll, and left/right mirroring. */
export function poseVector(image: Point[], world?: Point[]): number[] | null {
  if (handQuality(image)) return null;
  const p =
    world?.length === 21 &&
    world.every((p) => [p.x, p.y, p.z].every(Number.isFinite))
      ? world
      : image;
  const x = unit(sub(p[5], p[17]));
  if (!x) return null;
  const palm = sub(p[9], p[0]);
  const scale = Math.hypot(...palm);
  if (scale < 1e-5) return null;
  const projection = dot(palm, x);
  const y = unit(palm.map((v, i) => v - projection * x[i]));
  if (!y) return null;
  const z = [
    x[1] * y[2] - x[2] * y[1],
    x[2] * y[0] - x[0] * y[2],
    x[0] * y[1] - x[1] * y[0],
  ];
  const vector = p.slice(1).flatMap((point) => {
    const v = sub(point, p[0]);
    return [dot(v, x) / scale, dot(v, y) / scale, Math.abs(dot(v, z)) / scale];
  });
  const dx = image[8].x - image[5].x,
    dy = image[8].y - image[5].y;
  vector.push(Math.abs(dx) / Math.max(0.001, Math.hypot(dx, dy)));
  return vector;
}
export function poseDistance(a: number[], b: number[]) {
  return Math.sqrt(
    a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0) / a.length,
  );
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
      samples.length <= 32 &&
      samples.every(
        (row) =>
          Array.isArray(row) &&
          row.length === 61 &&
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
  const groupReady = personalLetters.every(
    (letter) => (profiles[letter]?.length || 0) >= 8,
  );
  const candidates = letters
    .filter((l) => profiles[l] && (!personalLetters.includes(l) || groupReady))
    .map((letter) => {
      const distances = profiles[letter]!.map((sample) =>
        poseDistance(vector, sample),
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
  if (!first || first.distance > 0.12) return null;
  if (
    second &&
    (second.distance - first.distance < 0.009 ||
      first.distance > second.distance * 0.85)
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
  if (!personalLetters.every((l) => profiles[l])) {
    const nearUnready = personalLetters.some((l) =>
      profiles[l]?.some((sample) => poseDistance(vector, sample) < 0.09),
    );
    if (nearUnready) return null;
  }
  const personal = personalPrediction(vector, profiles);
  // A partial C/M/N/O/S/T profile must not silently masquerade as S or A.
  return personal ?? recognizeLetter(image, world);
}
