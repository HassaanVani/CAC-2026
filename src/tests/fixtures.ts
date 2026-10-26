import { lessons, type Letter, type Point } from "../lib/handshape";
export function fixture(letter: Letter): Point[] {
  if (letter === "C" || letter === "O") return curveFixture(letter);
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
  if (letter === "H") return p.map((v) => ({ x: 1 - v.y, y: v.x, z: v.z }));
  return p;
}

/** Curved fingertips remain above the MCP row; only O closes to the thumb. */
export function curveFixture(letter: "C" | "O"): Point[] {
  const p = fixture("A");
  [5, 9, 13, 17].forEach((base, i) => {
    const x = [0.38, 0.48, 0.58, 0.68][i];
    p[base + 1] = { x, y: 0.4 + i * 0.012, z: -0.03 };
    p[base + 2] = { x: x - 0.01, y: 0.39 + i * 0.015, z: -0.1 };
    p[base + 3] = {
      x: letter === "O" ? 0.43 + i * 0.03 : x - 0.02,
      y: 0.5 + i * 0.014,
      z: -0.12,
    };
  });
  p[3] = { x: 0.3, y: 0.72, z: -0.05 };
  p[4] =
    letter === "C"
      ? { x: 0.3, y: 0.67, z: -0.1 }
      : { x: 0.43, y: 0.52, z: -0.12 };
  return p;
}
