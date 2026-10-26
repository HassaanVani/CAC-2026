import { palmFrame } from "./palmFrame";
export const letters = [
  "A",
  "B",
  "C",
  "D",
  "F",
  "H",
  "I",
  "L",
  "M",
  "N",
  "O",
  "S",
  "T",
  "U",
  "V",
  "W",
  "Y",
] as const;
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
  C: {
    title: "An open curve.",
    instruction:
      "Curve all four fingers and your thumb into the shape of a C. Keep an open gap between the fingertips and thumb.",
    tip: "Leave a clear gap between the thumb and fingertips for C.",
    fingers: [false, false, false, false],
  },
  H: {
    title: "Two fingers, pointing sideways.",
    instruction:
      "Extend your index and middle fingers together, pointing sideways. Curl your other fingers and rest your thumb across them.",
    tip: "H points sideways. U uses a similar handshape pointing upward.",
    fingers: [true, true, false, false],
  },
  M: {
    title: "Thumb under three fingers.",
    instruction:
      "Make a fist with your thumb tucked under your index, middle, and ring fingers. Its tip sits between your ring and little fingers.",
    tip: "The hidden thumb makes M hard to distinguish without your personal examples.",
    fingers: [false, false, false, false],
  },
  N: {
    title: "Thumb under two fingers.",
    instruction:
      "Make a fist with your thumb tucked under your index and middle fingers. Its tip sits between your middle and ring fingers.",
    tip: "Keep the thumb tip visible between the middle and ring fingers when possible.",
    fingers: [false, false, false, false],
  },
  O: {
    title: "Close the circle.",
    instruction:
      "Curve your fingers and bring their tips to your thumb, forming a rounded O. Keep the fingertips gently together.",
    tip: "For O, the fingertips meet the thumb. For C, leave the curve open.",
    fingers: [false, false, false, false],
  },
  S: {
    title: "A fist, thumb across the front.",
    instruction:
      "Curl all four fingers into a fist. Place your thumb across the front of your fingers.",
    tip: "For S the thumb crosses the front; for A it rests beside the fist.",
    fingers: [false, false, false, false],
  },
  T: {
    title: "Thumb between two fingers.",
    instruction:
      "Make a fist with your thumb tucked under the index finger. Let its tip show between the index and middle fingers.",
    tip: "Compare the thumb placement in T, N, and M before recording your examples.",
    fingers: [false, false, false, false],
  },
  D: {
    title: "One finger, pointing up.",
    instruction:
      "Extend your index finger. Curve your other fingers inward and touch your thumb to your middle fingertip, forming a small circle.",
    tip: "Keep the index upright and the thumb–middle fingertip contact visible.",
    fingers: [true, false, false, false],
  },
  F: {
    title: "A circle and three fingers.",
    instruction:
      "Touch your thumb and index fingertip to make a circle. Extend your middle, ring, and little fingers upward.",
    tip: "Keep the thumb–index circle closed and the other three fingers straight.",
    fingers: [false, true, true, true],
  },
  I: {
    title: "A little finger goes a long way.",
    instruction:
      "Make a fist, then extend only your little finger. Rest your thumb across the curled fingers.",
    tip: "Keep your thumb tucked in; an extended thumb changes this handshape to Y.",
    fingers: [false, false, false, true],
  },
  L: {
    title: "Make a little right angle.",
    instruction:
      "Extend your index finger upward and your thumb out to the side. Curl the other three fingers into your palm.",
    tip: "Leave a clear space between your thumb and index finger.",
    fingers: [true, false, false, false],
  },
  U: {
    title: "Two fingers, side by side.",
    instruction:
      "Extend your index and middle fingers together. Curl your ring and little fingers, with your thumb resting across them.",
    tip: "Keep the two extended fingertips close together; spreading them makes V.",
    fingers: [true, true, false, false],
  },
  V: {
    title: "Give your fingers some space.",
    instruction:
      "Extend your index and middle fingers in a V. Curl the ring and little fingers, and rest your thumb across them.",
    tip: "Spread the two extended fingers so the V is visible.",
    fingers: [true, true, false, false],
  },
  W: {
    title: "Three fingers, a little wider.",
    instruction:
      "Extend and spread your index, middle, and ring fingers. Curl your little finger into your palm and hold it with your thumb.",
    tip: "Show three upright fingers, with the little finger tucked away.",
    fingers: [true, true, true, false],
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
export const recordingRequiredLetters: readonly Letter[] = ["M", "N", "S", "T"];
export function handQuality(points: Point[]): string | null {
  if (
    points.length !== 21 ||
    points.some((p) => ![p.x, p.y, p.z].every(Number.isFinite))
  )
    return "Show one whole hand to the camera.";
  if (
    points.some((p) => p.x < 0.025 || p.x > 0.975 || p.y < 0.025 || p.y > 0.975)
  )
    return "Move your whole hand into the frame.";
  const scale = distance(points[0], points[9]);
  if (scale < 0.07) return "Bring your hand a little closer.";
  // Side-on C/O poses naturally foreshorten the knuckle row. Do not reject
  // them before world landmarks and the shape matcher can examine the hand.
  return null;
}
export type Match = { match: boolean; message: string };
export function matchHandshape(
  points: Point[],
  letter: Letter,
  world?: Point[],
): Match {
  const problem = handQuality(points);
  if (problem) return { match: false, message: problem };
  if (recordingRequiredLetters.includes(letter))
    return {
      match: false,
      message: `Set up personal examples for ${letter} to begin matching.`,
    };
  const horizontal =
    Math.abs(points[8].x - points[5].x) /
    Math.max(
      0.001,
      Math.hypot(points[8].x - points[5].x, points[8].y - points[5].y),
    );
  if (letter === "H" && horizontal < 0.8)
    return {
      match: false,
      message: "Point your index and middle fingers sideways.",
    };
  if (letter === "U" && horizontal > 0.6)
    return { match: false, message: "Point your two fingers upward for U." };
  // Use the model's metric world landmarks for aspect-ratio-independent angles.
  // Image landmarks remain the source for clipping and camera-distance checks.
  if (
    world?.length === 21 &&
    world.every((p) => [p.x, p.y, p.z].every(Number.isFinite))
  )
    points = world;
  const scale = distance(points[0], points[9]);
  if (scale < 0.0001)
    return { match: false, message: "Show your whole palm clearly." };
  if (letter === "C" || letter === "O") return matchCurve(points, letter);
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
  if (letter === "A") {
    const local = palmFrame(points);
    if (
      !local ||
      [5, 9, 13].some((base) => local[base + 3].y - local[base].y > -0.1)
    )
      return {
        match: false,
        message: "Curl your fingertips down into a fist for A.",
      };
  }
  const thumbOpen =
    angle(points[2], points[3], points[4]) > 145 &&
    distance(points[4], points[5]) / scale > 0.65;
  if ((letter === "L" || letter === "Y") && !thumbOpen)
    return { match: false, message: "Extend your thumb out to the side." };
  if (
    ["B", "H", "I", "U", "V", "W"].includes(letter) &&
    distance(points[4], points[9]) / scale > 0.85
  )
    return { match: false, message: "Fold your thumb toward your palm." };
  const thumbBeyondIndex =
    (points[4].x - points[5].x) * (points[5].x - points[17].x) +
    (points[4].y - points[5].y) * (points[5].y - points[17].y) +
    (points[4].z - points[5].z) * (points[5].z - points[17].z);
  if (letter === "A" && thumbBeyondIndex < -0.02 * scale * scale)
    return {
      match: false,
      message:
        "Rest your thumb outside the index finger, not between the fingers.",
    };
  if (
    letter === "A" &&
    (distance(points[4], points[5]) / scale > 0.72 ||
      (points[4].x - points[3].x) * (points[9].x - points[0].x) +
        (points[4].y - points[3].y) * (points[9].y - points[0].y) +
        (points[4].z - points[3].z) * (points[9].z - points[0].z) <=
        0)
  )
    return {
      match: false,
      message: "Rest your thumb upright beside your fist.",
    };
  const spread = distance(points[8], points[12]) / scale;
  if (letter === "V" && spread < 0.5)
    return { match: false, message: "Spread your index and middle fingers." };
  if ((letter === "U" || letter === "H") && spread > 0.4)
    return {
      match: false,
      message: "Bring your index and middle fingertips together.",
    };
  if (letter === "D" && distance(points[4], points[12]) / scale > 0.45)
    return {
      match: false,
      message: "Touch your thumb to your middle fingertip.",
    };
  if (letter === "F" && distance(points[4], points[8]) / scale > 0.4)
    return {
      match: false,
      message: "Touch your thumb and index fingertip to make a circle.",
    };
  if (
    letter === "W" &&
    (spread < 0.4 || distance(points[12], points[16]) / scale < 0.3)
  )
    return { match: false, message: "Spread your three extended fingers." };
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
/** C and O differ primarily at the thumb/fingertip aperture, rather than a
 * binary "all fingers curled" bitmask. World coordinates handle side views. */
function matchCurve(points: Point[], letter: "C" | "O"): Match {
  const local = palmFrame(points);
  if (!local)
    return {
      match: false,
      message: "Turn your hand slightly so the curve is visible.",
    };
  const bases = [5, 9, 13, 17];
  const straight = bases.filter(
    (base) => angle(points[base], points[base + 1], points[base + 3]) > 165,
  ).length;
  if (straight > 1)
    return {
      match: false,
      message: "Curve your fingers rather than holding them straight.",
    };
  const tipHeight =
    bases.reduce((sum, base) => sum + local[base + 3].y - local[base].y, 0) / 4;
  const forwardTips = bases.filter(
    (base) => local[base + 3].y - local[base].y >= -0.12,
  ).length;
  const indexForward = local[8].y - local[5].y >= -0.12;
  const middleForward = local[12].y - local[9].y >= -0.12;
  if (
    tipHeight < -0.12 ||
    !indexForward ||
    !middleForward ||
    forwardTips < (letter === "C" ? 3 : 2)
  )
    return {
      match: false,
      message:
        "Lift your curved fingertips away from the palm; avoid making a fist.",
    };
  const gap = distance(points[4], points[8]) / distance(points[0], points[9]);
  const middleGap =
    distance(points[4], points[12]) / distance(points[0], points[9]);
  if (letter === "O") {
    if (gap > 0.3 || middleGap > 0.48)
      return {
        match: false,
        message: "Bring your curved fingertips to your thumb to close O.",
      };
    return { match: true, message: "The closed O curve matches. Hold steady…" };
  }
  if (gap < 0.42)
    return {
      match: false,
      message: "Leave an open gap between your thumb and fingertips for C.",
    };
  if (gap > 1.5 || middleGap > 1.7)
    return {
      match: false,
      message: "Bring your thumb and curved fingers a little closer.",
    };
  return { match: true, message: "The open C curve matches. Hold steady…" };
}
/** A free-recognition result is never conditioned on the selected lesson. */
export function recognizeLetter(
  points: Point[],
  world?: Point[],
): Letter | null {
  const candidates = letters.filter(
    (letter) => matchHandshape(points, letter, world).match,
  );
  return candidates.length === 1 ? candidates[0] : null;
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
