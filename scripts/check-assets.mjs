import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const assets = {
  "public/models/hand_landmarker.task":
    "fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1",
  "public/wasm/vision_wasm_internal.js":
    "6f6b86509cf9e163ea1cfec7edc8cf53732699c04781e4c21c557c1ba402310e",
  "public/wasm/vision_wasm_internal.wasm":
    "cb3ec20026a9aecc2a81a93c25630ceb5389297ddb7a5f0bd61dd09cde606b9b",
  "public/wasm/vision_wasm_nosimd_internal.js":
    "9f8fc960e363f0fb2f42f7937b97ae9cf9a5630490f71031fa90caa9bb121938",
  "public/wasm/vision_wasm_nosimd_internal.wasm":
    "924274fcd5ac8985f6570a8573e7971b7bd2d580ba1b8f3beb0ba8f95db6347c",
};
for (const [path, expected] of Object.entries(assets)) {
  const actual = createHash("sha256").update(readFileSync(path)).digest("hex");
  if (actual !== expected)
    throw new Error(`Bundled MediaPipe asset checksum mismatch: ${path}`);
}
console.log(
  "Verified bundled MediaPipe 0.10.32 runtime and version-1 hand model.",
);
