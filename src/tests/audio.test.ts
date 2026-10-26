import { expect, it } from "vitest";
import { estimatePace } from "../lib/audio";
it("waits for enough elapsed time and ignores words outside the rolling window", () => {
  expect(estimatePace([{ text: "hi there", time: 1000 }], 5000, 0)).toBeNull();
  expect(
    estimatePace(
      [
        { text: "old words", time: 1000 },
        { text: "one two three four five", time: 35000 },
      ],
      40000,
      0,
    ),
  ).toBe(10);
  expect(estimatePace([], 40000, 0)).toBeNull();
});
