import type { Point } from "./handshape";
const subtract = (a: Point, b: Point) => [a.x - b.x, a.y - b.y, a.z - b.z];
const dot = (a: number[], b: number[]) =>
  a.reduce((sum, n, i) => sum + n * b[i], 0);
const unit = (v: number[]) => {
  const length = Math.hypot(...v);
  return length > 1e-6 ? v.map((n) => n / length) : null;
};
/** Palm-relative coordinates, with depth oriented toward the camera's z axis.
 * The camera-facing sign preserves front/back depth under left/right reflection.
 */
export function palmFrame(points: Point[]): Point[] | null {
  if (
    points.length !== 21 ||
    points.some((p) => ![p.x, p.y, p.z].every(Number.isFinite))
  )
    return null;
  const x = unit(subtract(points[5], points[17]));
  if (!x) return null;
  const palm = subtract(points[9], points[0]),
    scale = Math.hypot(...palm);
  if (scale < 1e-5) return null;
  const projection = dot(palm, x),
    y = unit(palm.map((n, i) => n - projection * x[i]));
  if (!y) return null;
  const z = [
    x[1] * y[2] - x[2] * y[1],
    x[2] * y[0] - x[0] * y[2],
    x[0] * y[1] - x[1] * y[0],
  ];
  const facing = z[2] < 0 ? -1 : 1;
  return points.map((point) => {
    const v = subtract(point, points[0]);
    return {
      x: dot(v, x) / scale,
      y: dot(v, y) / scale,
      z: (dot(v, z) * facing) / scale,
    };
  });
}
