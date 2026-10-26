# Common

**Every conversation, a little closer.**

A student-built communication app for Deaf, hard-of-hearing, and hearing people: live English captions, typed/spoken replies, observable sound cues, and a shared ASL fingerspelling studio. React, TypeScript, Vite, MediaPipe, and browser speech APIs. No account, backend, or paid API key.

## Run

Use Node **22.12+** and desktop Chrome. `.nvmrc` selects Node 22.

```sh
npm ci
npm run dev
```

Open Vite's printed localhost URL. Camera/microphone access needs localhost or HTTPS; opening the HTML file directly does not work.

```sh
npm test        # 55 focused tests
npm run check   # TypeScript
npm run build   # verify pinned vision assets, check types, build dist/
npm run preview # inspect the production build
```

Dependencies are pinned. The version-1 hand model, MediaPipe 0.10.32 runtime/WASM, and fonts are bundled and served from the same origin. Runtime model requests do not depend on a third-party CDN.

## Conversation

A single shared canvas holds captions and the attached reply composer, with quick phrases and optional voice cues in its side rail. Start/pause captions explicitly, change caption size, expand the canvas, type replies, speak them, and export or clear the transcript. Recognition pauses around speech playback to reduce feedback.

Voice cues show **relative microphone level**, plus an estimated rolling words-per-minute pace after eight seconds of captioning. They do not infer emotions or calibrated loudness. A clearly labeled sample is available when speech services cannot connect.

## Sign studio

Camera, trainer, and captured text share one workspace. **Focus sign studio** opens a compact view for recording a demo; Escape exits it.

Supported letters: **A, B, C, D, F, H, I, L, M, N, O, S, T, U, V, W, Y**.

- Eleven letters have built-in geometric checks. These use normalized joint angles/distances, thumb placement, finger spread, and MediaPipe world landmarks when available. H/U are distinguished by image orientation.
- **C, M, N, O, S, and T require personal examples.** These shapes are curved or easily confused when the thumb is occluded. All six must be recorded before the personal matcher emits any of that group. Partial groups remain unavailable.
- Every letter can be personalized. The matcher builds a palm-relative, scale/mirror-normalized pose vector and compares it with local examples. Far-away or ambiguous neighbors are rejected; no accuracy percentage is claimed.
- **Free sign-to-text** emits a supported letter after a stable 900ms hold. A held pose emits once. To repeat a letter, lower your hand for at least 300ms, then show it again. Space, undo, editing, copy, and speak controls are included.
- **Words & demo** offers DAD, DAY, WILL, LILY, and **“Hi, this is Common”**. This is guided fingerspelling: only the next correctly matched letter advances the phrase. Punctuation/case are formatted as the accepted prefix grows. The phrase is never filled from one pose or a demo playback button.

### Prepare “Hi, this is Common” for the reel

1. Open **Sign studio → Set up the demo phrase**. Turn on the camera and allow access.
2. Make the displayed H handshape. Select **Record H**, then hold still for 16 clear frames (about 1–2 seconds). This labels your example; it does not certify that you made the correct ASL shape.
3. Repeat the guided setup for **I, T, S, C, O, M, N**, using the same hand, framing, and lighting you will film with. Originals and simplified diagrams are linked to ASL University for reference. Recording restarts if the hand leaves the frame, another hand appears, or the pose moves substantially.
4. After N is saved, the app opens the demo phrase. Enter focus view. Fingerspell **H I T H I S I S C O M M O N**.
5. Hold each letter steadily. For the **second M**, lower your hand for at least 300ms before forming M again. The readable result becomes **Hi, this is Common** only as the letters match.
6. Rehearse before recording. Re-record examples that are ambiguous. The matcher can refuse a letter; it does not force the closest guess. Do not present manually edited text as automatic recognition.

Re-record a letter from its reference panel, or use **Delete personal examples** to remove saved calibration data. Change to free letter practice to edit captured text manually. The tutorial checks only handshape features; fingerspelling English words is not a translation of full ASL grammar or signed vocabulary.

## Privacy and practical limits

- Conversation content, edits, and quick phrases stay in React memory until cleared, refreshed, or closed. Conversation text survives switching workspaces. It is exported only when requested.
- Caption size, practiced letters, and **personal pose vectors** are stored in browser localStorage. No calibration photos or video are saved. The local measurements can be deleted from Sign studio; they are never committed to Git or sent to a backend.
- Camera frames are processed on your device. Common does not record audio. Browser speech recognition **may send audio to its provider**; browser/OS speech synthesis voices may also use online services. An internet connection may be needed.
- Recognition is experimental. Occlusion, lighting, camera perspective, hand anatomy, and the limitations of predicted landmarks can cause false matches or rejections. Personal examples improve adaptation but do not prove accuracy. M/N/T can remain ambiguous even after setup.
- Use one clearly visible hand and follow the reference orientation. This is not a fluency assessment, arbitrary signed-word translator, interpreter replacement, or medical device. J and Z motion recognition and the rest of the alphabet are outside the current supported set.
- Desktop Chrome is the target. Typed replies work if speech recognition is unavailable. Real-camera/signing accuracy and successful live speech transcription still need hands-on acceptance testing; they are not established by synthetic landmark tests.
- No Deaf-user study or instructor validation has been completed. Describe authorship and AI assistance accurately in the competition submission. No endorsement by ASL University, an elected official, or a disability organization is claimed.

## Implementation and validation

- `src/lib/handshape.ts`: supported lessons, quality checks, built-in geometry rules.
- `src/lib/calibration.ts`: validated local profiles and conservative personal-example recognition.
- `src/lib/fingerspelling.ts`: stable capture, neutral/repeat gating, phrase-prefix formatting.
- `src/hooks/useHandCamera.ts`: cancellable camera/model loading, bounded inference (~12fps), video-aligned overlay, and resource cleanup.
- `src/lib/speech.ts`, `audio.ts`, `transcript.ts`: speech session boundaries, audio levels/pace, transcript reducer/export.

The 55 tests cover built-in synthetic handshapes and mirrored geometry, requests for calibration, invalid/clipped/distant hands, scale normalization, thumb/spread checks, profile validation, ambiguous/distant personal examples, repeat-letter gating, exact demo phrase coverage/prefix formatting, transcript transitions/export, recognition permission/network/session boundaries, audio cleanup, and pace calculation. They do not measure real-world recognition accuracy.

Browser QA includes the desktop and 390px layouts, all lesson controls, guided-demo selection/setup entry, focused studio and Escape, sign text alongside the trainer, sample/quick replies, and transcript navigation retention. The original in-app speech test returned a provider network error, with a recoverable UI message. Actual speech-provider connectivity, microphone levels, every camera letter, and calibration accuracy require a real-device rehearsal.

Manual acceptance before filming:

- [ ] Chrome captions finalize actual spoken words; pause/resume and spoken replies avoid feedback.
- [ ] Real microphone levels respond and estimated pace appears after speaking.
- [ ] Camera permission denial/cancel/disconnect recover without losing typed communication.
- [ ] Record demo examples; confirm both correct letters and deliberately wrong poses, including ambiguous M/N/T and repeated M.
- [ ] Switching away or stopping releases the camera, model, animation loop, microphone, and speech playback.
- [ ] Keyboard through controls, Escape from dialogs/focus view, and reduced-motion display.
- [ ] Export/clear transcript, refresh, and confirm only declared preferences/profiles remain.

## Netlify

The repository includes **`netlify.toml`**. In Netlify, choose **Add new project → Import an existing project**, select GitHub and **HassaanVani/CAC-2026**, and use branch **main**. No secrets or environment variables are required.

- Build command: **`npm run build`**
- Publish directory: **`dist`**
- Node version: **22**, configured in the repository

Netlify serves the site over HTTPS, which camera/microphone APIs need. The configuration sets the WASM and `.task` content types, same-origin camera/microphone permission policy, and revalidation for unversioned model/runtime assets. Keep `dist/assets`, `dist/models`, `dist/wasm`, `dist/licenses`, and logo files intact. No redirect fallback is necessary: navigation uses React state rather than URL routes. Avoid embedding the app in an iframe for the demo.

Alternatively, run `npm ci && npm run build` and upload the **contents of `dist/`** using Netlify's manual deploy flow. The local `artifacts/common-web.zip` package, when generated, has these contents at its root. A GitHub push makes the app hostable; it does not by itself create a Netlify project or verify a live deployment. After connecting Netlify, test the deployed origin because localhost permissions do not transfer.

[Official Vite-on-Netlify guide](https://docs.netlify.com/build/frameworks/framework-setup-guides/vite/).

## Two-minute reel outline

**0:00–0:20:** Show the Common C/ear mark and explain the communication gap the app addresses.

**0:20–0:55:** Demonstrate captions, a typed spoken reply, and optional sound cues. Explain that sound level and pace are not emotion detection.

**0:55–1:35:** Open the sign studio in focus view with your real calibration already prepared. Fingerspell **“Hi, this is Common”**. Show the repeated-M pause and readable output. Explain that this is guided fingerspelling with local hand landmarks and personal examples.

**1:35–2:00:** Show a wrong pose being rejected, name the React/MediaPipe/browser API architecture, and explain that Deaf-user and instructor feedback is the next step. Stop the camera.

## Branding and credits

The original C/ear logo is available as `public/common-mark.svg`, `public/common-logo.svg`, and `public/favicon.svg`. [Brand notes](docs/BRAND.md).

- [ASL University / Dr. Bill Vicars: fingerspelling reference](https://www.lifeprint.com/asl101/fingerspelling/abc.htm). Common's diagrams/lesson wording are simplified original work; Lifeprint artwork is not bundled.
- [MediaPipe Hand Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js), `@mediapipe/tasks-vision` **0.10.32**, Apache-2.0.
- [Google version-1 hand model](https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task), SHA-256 `fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1`.
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API), [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API), [Lucide](https://lucide.dev/) (ISC), React (MIT).
- Self-hosted DM Sans and Manrope through Fontsource (SIL Open Font License). License notices are in `public/licenses/`.
