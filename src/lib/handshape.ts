export const letters = ["A", "B", "L", "V", "Y"] as const;
export type Letter = (typeof letters)[number];
export type Point = { x: number; y: number; z: number };
export const lessons: Record<
  Letter,
  {
    title: string;
    instruction: string;
    tip: string;
    fingers: [boolean, boolean, boolean, boolean];
  }
> = {
  A: {
    title: "Start with a soft fist.",
    instruction:
      "Curl all four fingers into your palm. Keep your thumb straight along the side of your index finger, with its tip pointing up.",
    tip: "Your thumb rests beside the fist, rather than across the front.",
    fingers: [false, false, false, false],
  },
  B: {
    title: "Four fingers, together.",
    instruction:
      "Extend all four fingers upward and hold them together. Fold your thumb across your palm.",
    tip: "Face your palm toward the camera and keep the fingers close together.",
    fingers: [true, true, true, true],
  },
  L: {
    title: "Make a little right angle.",
    instruction:
      "Extend your index finger upward and your thumb out to the side. Curl the other three fingers into your palm.",
    tip: "Leave a clear space between your thumb and index finger.",
    fingers: [true, false, false, false],
  },
  V: {
    title: "Give your fingers some space.",
    instruction:
      "Extend your index and middle fingers in a V. Curl the ring and little fingers, and rest your thumb across them.",
    tip: "Spread the two extended fingers so the V is visible.",
    fingers: [true, true, false, false],
  },
  Y: {
    title: "Open at both ends.",
    instruction:
      "Extend your thumb and little finger outward. Curl your index, middle, and ring fingers into your palm.",
    tip: "Keep the middle three fingers tucked in and your palm facing forward.",
    fingers: [false, false, false, true],
  },
};
const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
function angle(a: Point, b: Point, c: Point) {
  const u = [a.x - b.x, a.y - b.y, a.z - b.z];
  const v = [c.x - b.x, c.y - b.y, c.z - b.z];
  const length = Math.hypot(...u) * Math.hypot(...v);
  return length
    ? (Math.acos(
        Math.max(
          -1,
          Math.min(1, u.reduce((s, x, i) => s + x * v[i], 0) / length),
        ),
      ) *
        180) /
        Math.PI
    : 0;
}
export type Match = { match: boolean; message: string };
export function matchHandshape(points: Point[], letter: Letter): Match {
  if (
    points.length !== 21 ||
    points.some((p) => ![p.x, p.y, p.z].every(Number.isFinite))
  )
    return { match: false, message: "Show one whole hand to the camera." };
  if (
    points.some((p) => p.x < 0.035 || p.x > 0.965 || p.y < 0.035 || p.y > 0.965)
  )
    return { match: false, message: "Move your whole hand into the frame." };
  const scale = distance(points[0], points[9]);
  if (scale < 0.07)
    return { match: false, message: "Bring your hand a little closer." };
  const fingerBases = [5, 9, 13, 17];
  const extended = fingerBases.map(
    (base) =>
      angle(points[base], points[base + 1], points[base + 3]) > 150 &&
      distance(points[base + 3], points[0]) >
        distance(points[base + 1], points[0]) * 1.12,
  );
  const expected = lessons[letter].fingers;
  const names = ["index", "middle", "ring", "little"];
  const mismatch = extended.findIndex((value, i) => value !== expected[i]);
  if (mismatch >= 0)
    return {
      match: false,
      message: `${expected[mismatch] ? "Extend" : "Curl"} your ${names[mismatch]} finger.`,
    };
  const thumbOpen =
    angle(points[2], points[3], points[4]) > 145 &&
    distance(points[4], points[5]) / scale > 0.65;
  if ((letter === "L" || letter === "Y") && !thumbOpen)
    return { match: false, message: "Extend your thumb out to the side." };
  if (
    (letter === "B" || letter === "V") &&
    distance(points[4], points[9]) / scale > 0.85
  )
    return { match: false, message: "Fold your thumb toward your palm." };
  if (
    letter === "A" &&
    (distance(points[4], points[5]) / scale > 0.72 || points[4].y > points[3].y)
  )
    return {
      match: false,
      message: "Rest your thumb upright beside your fist.",
    };
  const spread = distance(points[8], points[12]) / scale;
  if (letter === "V" && spread < 0.4)
    return { match: false, message: "Spread your index and middle fingers." };
  if (
    letter === "B" &&
    [
      distance(points[8], points[12]),
      distance(points[12], points[16]),
      distance(points[16], points[20]),
    ].some((d) => d / scale > 0.48)
  )
    return { match: false, message: "Bring your four fingers together." };
  return { match: true, message: "That handshape matches. Hold steady…" };
}
export class StableHold {
  private since: number | null = null;
  update(match: boolean, now: number) {
    if (!match) {
      this.since = null;
      return 0;
    }
    this.since ??= now;
    return Math.min(1, (now - this.since) / 1000);
  }
  reset() {
    this.since = null;
  }
}
