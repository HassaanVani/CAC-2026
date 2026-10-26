# Common

**A little help listening. A little space to reply.**

Common is a student-built web app for Deaf, hard-of-hearing, and hearing people. It combines English live captions, typed and spoken replies, observable voice cues, and introductory camera-assisted ASL handshape practice. Built for the 2026 Congressional App Challenge, with no accounts, backend, or paid API keys.

## Run locally

Use Node.js **22.12+** (also tested on Node 25.6) and desktop Chrome.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite, normally **http://127.0.0.1:5173/**. Camera and microphone access require localhost or HTTPS. Opening `index.html` directly from disk does not work.

```sh
npm test       # focused unit tests
npm run check # TypeScript check
npm run build # TypeScript check + production bundle in dist/
npm run preview # inspect the production build on localhost:4173
```

All dependencies are pinned in `package-lock.json`. MediaPipe JavaScript/WASM and the version-1 hand model are bundled locally; fonts are also self-hosted. No third-party model request is needed at runtime.

## What works

- **Conversation:** explicit start/pause for browser speech recognition, interim/final captions, three text sizes, an expanded caption view, text replies, speech synthesis, editable quick phrases, clear and text-file export.
- Captions pause before text-to-speech and resume after playback if previously listening. Speech playback can be stopped. Switching workspaces stops speech/audio and retains the conversation in memory.
- **Voice cues:** optional relative microphone level, plus a rolling 30-second words-per-minute estimate while captions are listening (after at least 8 seconds). Level depends on distance, device gain, and ambient sound. These are not emotion labels or calibrated decibels.
- **ASL practice:** five static handshapes (A, B, L, V, Y), original simplified illustrations, explicit thumb/finger instructions, mirrored preview, landmark overlay, feedback, and a continuous one-second matching hold. Either hand is supported by distance/angle rules.
- Permission and service errors include recovery guidance. Sample content is explicitly labeled and removed when real conversation starts.

## Privacy and limitations

- Transcript, interim captions, typed replies, and edited phrases stay in React memory. They survive workspace navigation, but clear on refresh/close. Only caption size and completed letters are stored locally. Transcript export happens only when requested.
- Common does not record audio or upload camera video. Camera frames are processed on the device. Browser speech recognition **may send audio to its provider** and usually needs an internet connection. Browser text-to-speech voices can also depend on the browser/OS and may use online services.
- Desktop Chrome is the target. Browser speech support varies; typed replies remain available when recognition fails. The in-app browser tested here returned a speech-provider network error; successful real-audio transcription remains a manual Chrome acceptance check.
- The matcher is a deliberately limited geometry heuristic, not a trained ASL classifier. It may accept incorrect poses or reject correct ones, especially under occlusion, foreshortening, poor lighting, rotation, or atypical hand anatomy. Hold one upright hand with palm facing the camera. It does not verify palm orientation or every ASL distinction.
- Practice is **not** sentence translation, an ASL fluency assessment, or a replacement for a Deaf instructor/interpreter. The illustrations are simplified; use the linked ASL University reference for detailed examples. No Deaf-user usability study has been completed.
- No emotion inference, speaker diarization, medical use, or arbitrary sign recognition is claimed.

## Architecture

React + TypeScript + Vite, with Lucide icons and self-hosted DM Sans/Manrope fonts.

- `src/components/Conversation.tsx`: conversation UI, speech synthesis coordination, preferences, export, and quick phrases.
- `src/lib/speech.ts`: typed browser recognition adapter; per-session generations discard stale callbacks.
- `src/lib/transcript.ts`: pure reducer, deduplication, sample/live boundaries, and export formatting.
- `src/lib/audio.ts`: optional Web Audio microphone analyser, cancellable startup, cleanup, pace estimation.
- `src/components/Practice.tsx`: lazy camera/model startup, inference at at most 10 fps, video-aligned canvas, stable holds, progress, and cleanup. Pending permission/model results are invalidated when cancelled.
- `src/lib/handshape.ts`: normalized finger-joint angle/distance rules and a stable-hold timer, independent of UI.

Device modules use idle/loading/active/error states. Tracks, animation loops, and model resources are released on stop or workspace departure. Inference uses CPU for compatibility; it can briefly occupy the main thread on slower devices.

## Validation

Automated tests cover transcript interim/final transitions, duplicate/blank entries, sample/live boundaries, Unicode export, five synthetic handshapes with mirrored hands, wrong poses, scale normalization, absent/clipped/distant hands, thumb/spread checks, interrupted holds, speech interruption/permission errors/stale results, microphone cleanup, late permission grants, and pace estimates.

Browser checks completed during implementation:

- Desktop and 390-pixel layouts; selecting lessons and reference instructions.
- Sample labeling, quick reply → actual transcript, caption scaling, and transcript retention across navigation.
- Spoken-reply UI lifecycle (begin/end), caption startup and network-error recovery.
- Exported text file inspected and matched the typed reply.
- Camera permission-pending startup and cancellation. Real camera recognition has **not** been verified with a signer.

Before recording or submitting, complete these manual checks in **desktop Chrome**:

- [ ] Allow the microphone; say two sentences and verify finalized words, interim captions, and pause.
- [ ] While listening, speak a typed reply; confirm no self-caption feedback and automatic resumption.
- [ ] Enable voice cues; verify relative level changes and estimated pace after speaking for 10–30 seconds.
- [ ] Deny camera/microphone once; verify recovery guidance and that text replies still work.
- [ ] Allow the camera; perform A/B/L/V/Y with each hand. Hold each for a second, try incorrect poses, remove the hand, and verify the hold resets. If a pose fails, adjust the heuristic against observed landmarks rather than claiming an accuracy rate.
- [ ] Stop or navigate away; verify browser camera/microphone indicators turn off. Test cancellation while permission or model loading is pending.
- [ ] Keyboard through navigation, caption settings, reply controls, and About dialog; test Escape and reduced motion.
- [ ] Download the transcript, clear the session, and refresh; only display preferences/progress should remain.

## Two-minute demo script

**0:00–0:15 — The problem.** “Communication should not depend on whether two people hear or speak in the same way. Common gives both sides a shared space.” Show the conversation workspace.

**0:15–0:50 — A conversation.** Start captions in Chrome and have a partner speak. Show interim/final text, enlarge captions, then type a reply and select Speak reply. Explain how the app pauses recognition during playback. If the speech provider is unavailable, use the clearly labeled sample and disclose the limitation.

**0:50–1:10 — Context.** Enable microphone cues and demonstrate relative loudness and pace. “These describe sound, not someone’s emotions.” Show a quick phrase and export.

**1:10–1:45 — Learn a little.** Open ASL practice, choose L, follow the reference, start camera, and hold the matching shape. Show a wrong pose resetting the timer, then the completion marker. “This checks a few introductory handshapes, not complete ASL.”

**1:45–2:00 — How and why.** Explain React, browser speech, Web Audio, and MediaPipe landmarks plus geometry rules. Mention video stays local and the next step is feedback from Deaf users and instructors. Stop the camera.

## HTTPS hosting

Build with `npm ci && npm run build`. Publish **the contents of `dist/`** to any static HTTPS host (for example Netlify, Vercel, or Cloudflare Pages). Build command: `npm run build`; output directory: `dist`; no environment variables. No public deployment has been made by this task.

Keep `/wasm/`, `/models/`, `/licenses/`, and `/assets/` intact. Serve `.wasm` as `application/wasm`, JavaScript as a JavaScript MIME type, and `.task` as a binary asset. Do not rewrite those asset requests to the HTML shell. There is no client-side URL router, so SPA rewrite rules are unnecessary. Allow camera and microphone for the site itself; embedding in an iframe requires explicit camera/microphone permission and is not the target.

For subdirectory hosting, set Vite's `base` to the subdirectory before building. MediaPipe resolves assets using `import.meta.env.BASE_URL`. No COOP/COEP headers or service worker are required. After deployment, test camera/mic permissions on the deployed origin; localhost permissions do not transfer.

## References and credits

- [ASL University / Dr. Bill Vicars — fingerspelling reference](https://www.lifeprint.com/asl101/fingerspelling/abc.htm). Lesson wording and vector diagrams in Common are original simplified guides; no Lifeprint artwork is bundled. The project is not endorsed by ASL University.
- [Google MediaPipe Hand Landmarker web guide](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js) and [`@mediapipe/tasks-vision`](https://www.npmjs.com/package/@mediapipe/tasks-vision), pinned at 0.10.32, Apache-2.0.
- [Google version-1 hand model](https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task), SHA-256 `fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1`.
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API), [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API), and [Lucide](https://lucide.dev/) (ISC).
- DM Sans and Manrope, bundled through Fontsource under the SIL Open Font License; license texts are included in `public/licenses/`.

Describe authorship and AI assistance accurately in the competition submission. This project is independently built and makes no claim of endorsement by an elected official or disability organization.
