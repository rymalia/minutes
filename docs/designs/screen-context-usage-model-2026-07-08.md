# Design exploration: screen-context usage model — which screenshots, how many, and how agents should read them

Status: exploration draft v2.1 (2026-07-08). v1 reviewed by Codex (planning
review, two passes) and a parallel Claude session; this revision integrates
their corrections — most importantly the chunking×sampling interaction (§6)
and the reframe of the selector from "settled spec" to "candidate signals for
an evaluation harness" (§7). Companion to the screen-context delivery PR
(`fix(jobs)` retention + `feat(summarize)` agent-CLI delivery).

## 1. The problem

Capture and consumption are wildly mismatched:

- **Capture** runs at `screen_context.interval_secs` (default 30s; 15s in
  local config) — but **stops entirely after `MAX_SCREENSHOTS = 60` frames**
  (`screen.rs:144`). At 15s that's the first **15 minutes** of the meeting;
  at 30s, the first 30. (The const's comment still describes the old 8-image
  API rationale — stale.)
- **Consumption** is `MAX_SCREEN_IMAGES = 8`, taken from `list_screenshots()`
  which sorts filenames ascending — i.e. **the first 8 chronologically**.

So a 60-minute meeting suffers **three stacked coverage cuts**: capture stops
at minute 15–30 → selection keeps only the first ~2–4 minutes → and the agent
transcript itself truncates at 100k bytes (§6). The feature's implicit
promise — "the summary understands what was on screen" — currently holds
only for the meeting's opening. (Frame counts elsewhere in this doc that
assume full-meeting capture, e.g. "240 frames," describe the post-cap-raise
world; current code tops out at 60.)

## 2. Grounding facts (verified in code)

| Fact | Where |
|---|---|
| Filename format `screen-{index:04}-{elapsed:04}s.png` — elapsed seconds embedded | `screen.rs:107` |
| Capture interval config, default 30s | `config.rs` (`ScreenContextConfig`) |
| Cap `MAX_SCREEN_IMAGES = 8`, `.take()` after ascending sort | `summarize.rs` (`existing_screen_files`, `read_and_encode_images`) |
| **Agent path is unchunked but truncated** — one prompt, transcript capped at `max_transcript = 100_000` UTF-8 **bytes**, tail silently dropped | `summarize_with_agent_impl_timeout` |
| Transcript lines carry `[M:SS]` stamps — truncation endpoint is parseable | `transcribe.rs:1009` |
| **API path chunks long transcripts and attaches images to the first chunk only** | `summarize.rs` chunking |
| Capture **stops after 60 frames** (`MAX_SCREENSHOTS`, stale comment) | `screen.rs:105,144` |
| Screenshots are resized to 1280px wide at capture (~200KB each); no further downscaling before delivery | `screen.rs` `TARGET_WIDTH` |

The filename timestamps are the load-bearing discovery: dwell time, temporal
coverage, and transcript alignment are all computable from the directory
listing alone. But the chunking fact is the load-bearing *constraint* — see
§6.

## 3. How many is "too many"? (working assumptions, not measurements)

Vision-token estimates (~1.1–1.6k tokens per screenshot after provider-side
downscaling) are **heuristics** — actual cost depends on provider resizing,
model, and image dimensions. Log real usage before optimizing against these
numbers.

| Images | Approx. token cost | Verdict |
|---|---|---|
| 8 | ~9–13k | current cap; cheap, but myopic if taken from the front |
| 10–16 | ~14–26k | working sweet spot for a 1-hour meeting *if well-chosen* |
| 24 | ~28–38k | defensible for dense slideshares; likely diluting attention |
| 240 (all, 15s×60min) | ~380k | impossible — exceeds context with transcript |

Two working conclusions:

1. The right question is not "how many shots per hour" but **"how many
   *distinct visual states*"**. A slide-deck meeting has ~15–40 states; a
   Zoom-gallery-only call has ~1 that matters; a live-coding demo has
   hundreds (continuous change) and needs dwell-weighting, not more images.
2. The count cap is a safety rail, not the strategy — **redundancy is the
   primary control**. Fix selection first.

## 4. What makes a screenshot important — signal inventory

Ranked by cost-to-implement (all local, privacy-preserving):

| Signal | What it captures | Cost |
|---|---|---|
| **Temporal spread** | don't let any meeting segment go unrepresented | free (filenames) |
| **Novelty** (changed-area analysis vs. last-kept frame) | "new slide / new app / share started" | cheap; needs PNG decode |
| **Dwell time** (how long a state persisted) | "this slide was up for 12 minutes" ≫ "flashed for 15s" | free once novelty exists |
| **Transcript deixis** ("as you can see", "this slide", "on my screen" near the frame's timestamp) | speech explicitly pointing at the screen | cheap text heuristics |
| **Content class** (text-dense slide/doc vs. video-call face grid vs. desktop noise) | filters the "Zoom gallery only" and blank-desktop failure modes | heavier: OCR or model-side judgment |

Anti-signal worth naming: the **face-grid call** — frames change constantly
(people move) but carry no discussable content. Novelty alone over-selects
them.

Keep novelty, dwell, and temporal coverage as **separate ranking dimensions**
until real data supports combining them — a composite like dwell×changed-area
conflates transition magnitude with the importance of the resulting state
(an important state introduced by a small visual change gets buried).

## 5. Consumption strategies (how the agent should read the images)

**A. Labeled batch (baseline, near-free).** Hand K images labeled with their
meeting-time offsets ("screen-0042 = 21:00 into the meeting") and instruct:
*"Images are chronological screen states. For each, note what is NEW versus
the previous image, then weave visual details into the summary where the
transcript references them."* Delta tracking as a prompt obligation.

**B. Agent-directed browsing (agent path only).** `--add-dir` already grants
claude the whole directory. Hand it the full manifest (filenames = timeline)
with a budget instruction: *"~N screenshots exist, filenames encode meeting
time. Open at most 12, chosen to (a) cover the whole meeting and (b) inspect
moments where the transcript suggests screen content mattered."* Zero Rust
selection logic; nondeterministic; worth a spike behind config.

**C. Two-pass description.** Cheap pass captions every state, second pass
summarizes transcript + captions. Most thorough, most expensive — hold until
A/B prove insufficient.

## 6. The coverage constraint (Codex findings — shapes everything below)

One rule governs every delivery path:

> **Selection must not deliver images from time ranges whose transcript was
> OMITTED from the model call.**

(Scope note: the rule targets omitted-but-existing transcript — the false-
association hazard. Images from ranges where nothing was *said* (trailing
silence, silent screen-share viewing) are not violations: there is no text to
falsely associate, and end-of-meeting screenshots are often the most
valuable. An always-on timestamp bound would wrongly drop those.)

Both paths violate the naive "sample the whole meeting" idea, differently:

**API path — chunking.** Long transcripts are split into chunks and all
selected images attach to the **first chunk only**. Today's "first 8"
selection *accidentally aligns* with that (chunk 1 covers the meeting's
start, so do the first 8 images). Global even sampling would pair a
minute-55 image with minute-0–10 transcript — false association. API-path
selection stays "first 8" until chunk-aware delivery exists: typed
screenshot timestamps, frames partitioned by each chunk's time range, image
budget applied across chunks, tests that no chunk receives out-of-window
frames.

**Agent path — the 100k-byte truncation.** The agent prompt is NOT the full
transcript: `summarize_with_agent_impl_timeout` truncates at
`max_transcript = 100_000` **UTF-8 bytes** (~2h of typical speech) at a char
boundary, silently dropping the tail. Even sampling over the whole meeting
would reproduce the same mismatch on long recordings — a post-cutoff image
with no corresponding transcript. Mitigation is cheap because transcript
lines carry `[M:SS]` stamps (`transcribe.rs`): truncate at the **last
complete line** within the cap (so a partially-delivered line's stamp can't
extend the bound), parse the last surviving stamp, and bound sampling to
screenshots at or before it. If no stamp parses, the temporal endpoint is
unknowable — fall back to first-N as a conservative *compatibility* choice
(start-anchoring minimizes but cannot eliminate mismatch risk). Required
test: a >100k transcript where no selected screenshot falls after the last
included transcript timestamp. (All implemented 2026-07-08, incl. the
line-boundary cut.)

On the cap itself (Codex analysis, adopted): **keep the guard** — `agent`
/`auto` can invoke arbitrary CLIs whose model context is unknowable, so
unbounded input risks rejection/timeout — but its current form is crude:
byte-measured, silently tail-dropping (preferentially losing decisions and
action items, which cluster at meeting ends), cutting mid-line, unreported.
Near-term hygiene: document it as a byte limit, cut at the last complete
transcript line, and log a truncation warning (implemented as
`tracing::warn!` — surfacing it in user-facing processing status is a
follow-up). The durable fix is
**agent map/reduce chunking** (roadmap slice 3): preserve today's
single-call behavior ≤100k; above it, split into ~80–100k chunks at speaker
turns with modest overlap (5–10k or a few turns), attach only
temporally-in-range screenshots per chunk, extract structured facts per
chunk, and merge by identity+timestamp in a synthesis pass (overlap
preserves boundary continuity; synthesis still owns cross-chunk reasoning,
e.g. a minute-10 proposal approved at minute 55). Chunk sizing is an
evaluation output — test 50k/75k/100k for decision recall, boundary
omissions, duplicate facts, runtime.

The same constraint splits timestamp work in two:
- **Timestamp labeling** (name each image's meeting-time in the prompt) —
  safe everywhere, immediately.
- **Transcript correlation** (claiming "at 14:32 the screen showed X while
  speakers said …") — only valid where image + matching transcript lines
  reach the same model call: agent path within the truncation bound now,
  API path after chunk-aware delivery.

## 7. Selector prototype: an evaluation harness, not an implementation

v1 specified a single pipeline (absdiff vs last-kept → morphology →
largest-connected-component rule). Review exposed a blind spot: **same-layout
text changes** (new bullet text, code edits, spreadsheet cells) produce many
glyph-sized components, often well under both a largest-component threshold
and a total-change threshold — and morphological opening erodes exactly that
signal. The same blindness we rejected pHash for, one level up. The premise
"slide transitions change 60–90% of pixels in one block" is a heuristic, not
a design invariant.

So the prototype's purpose changes: **evaluate candidate signals, don't
presume a winner.** A Rust scratchpad harness (same `image`-crate pixel
pipeline that would ship — thresholds calibrated under OpenCV kernels don't
survive a port) that:

- Emits per-frame metrics to JSON/CSV: total changed fraction (at multiple
  resolutions), largest-component fraction, changed-pixel bounding-box
  fraction, component count/area distribution, diff vs previous AND vs
  last-kept, edge/text-region change, color-sensitive variant (grayscale
  misses color-only chart/status changes), keep/reject decision + reason.
- Renders contact sheets showing timestamps, ground-truth labels, decisions,
  and metrics for visual iteration.
- Compares variants with/without morphology, static-strip masking (masking
  browser chrome can hide tab/app changes — treat as a variant, not a
  default), debounce, grayscale.
- Implements debounce as an explicit state machine (a candidate becomes
  "last kept" only after persistence confirms).
- Tests slow cumulative change separately: last-kept diffing helps, but
  eventually classifies gradual scrolling as one large transition.

**Fixtures must be adversarial**, not just obvious slide cuts: same-template
slides with only text changed; small dialog/code edit; color-only chart
change; slow scrolling; persistent notifications; moving webcam tile beside
static content; screen-share start/stop; resolution/layout changes.

**Acceptance is recall-first**: retain every meaningful transition; keep
false positives within the downstream image budget ("zero jitter frames" is
too strict). Synthetic data proves algorithm correctness and exposes edge
cases; **production thresholds come from retained real meeting sequences**
(none exist yet — retention was broken until this branch).

**Deliverable: an evidence report** — metrics, contact sheets, recommended
rules — not a binary with guessed thresholds baked in.

### Harness results (2026-07-08 — full report: `_temp/screen-select-harness/REPORT.md`)

Ran: 9 adversarial fixtures × 127 frames × 5 candidate rules × debounce
on/off, 16 metric variants per frame. Headline findings:

- **The discriminating signal is `bbox_occupancy`** (changed pixels ÷
  bounding-box area — how densely a change fills the region it spans). It is
  the only tested signal separating same-template text edits (0.11–0.15)
  from webcam/gallery/cursor jitter (≤0.06). Total-change, largest-CC, and
  component-count all fail — largest-CC points the *wrong way* (a webcam
  tile's component is bigger than a text edit's).
- **Two v1-spec defaults are inverted by the evidence**: morphological open
  erodes glyph-sized text changes (drop it), and grayscale diffing is blind
  to color-only changes like chart recolors (diff color-aware).
- **Debounce's real job is absorbing 1-frame toasts, not rejecting talking
  heads** — sub-threshold jitter reads as "stable" at 256px, so debounce
  alone still promotes webcam noise; only the occupancy gate rejects it.
- **Winning rule `E_occupancy+deb`**: keep if color-total > 0.05 OR (bbox >
  0.18 AND occupancy > 0.09), debounce 2 frames, heartbeat every 8 —
  perfect novelty recall, zero false positives across all fixtures.
- **Honest limitations**: slow scrolling degrades to heartbeat-only coverage
  (needs a dedicated dwell/scroll signal); the 0.09 occupancy threshold has
  only ~0.03 margin on synthetic data and real low-frequency webcam motion
  may defeat it — **the #1 thing to re-measure on real captures**. The
  transferable result is the structure and signal ranking, not the numbers.
- Cost: 9.2ms/frame for the full 16-variant matrix; a shipping selector
  (2–3 variants) will be well under that.
- **Status: leading candidate structure identified, pending real-capture
  calibration** — not "answered". Known harness gaps to close before/with
  calibration: no persistent-notification fixture (only the 1-frame toast),
  no resolution/display-layout-change fixture, and no edge/text-region
  metric from the original matrix. Synthetic construction also favors the
  occupancy signal (dense-rect "text", high-frequency "webcam" noise that
  downscales away) — the report says this itself.
- Sampling note (applies to the shipped Phase-0 code, not just the
  selector): `even_sample` is **positional**, not temporal — capture
  failures leave time gaps, so even positions only approximate even
  meeting-times. Time-targeted selection via parsed elapsed stamps is a
  possible refinement.

## 8. Roadmap (revised per review)

1. **Current PR** (delivery branch, already green):
   - Retention fix + capability-gated agent delivery + injection hardening
     (landed).
   - Even temporal sampling — **agent path only**, bounded by the truncation
     endpoint (last `[M:SS]` stamp surviving the 100k cut; fall back to
     first-N when no stamp parses). Required test: >100k transcript, no
     selected screenshot after the last included timestamp. API path keeps
     "first 8" until chunk-aware delivery exists.
   - Timestamp labels on delivered frames — no correlation claims yet.
   - Truncation hygiene: log a warning when the 100k cap trims a transcript.
2. **Next slice — chunk-aware API delivery**: typed screenshot timestamps;
   partition by chunk time range; budget across chunks; out-of-window tests.
   Unlocks selection improvements + transcript correlation for API engines.
3. **Agent map/reduce chunking** (see §6): single call ≤100k preserved;
   ~80–100k chunks with speaker-turn overlap above; per-chunk in-range
   screenshots; structured-fact merge in synthesis; chunk size from
   evaluation, not assumption. Removes silent tail loss for long meetings.
4. **Prototype slice — the §7 harness**: measure candidate signals against
   adversarial fixtures; evidence report; only then choose the selector rule.
5. **Later**: raise/remove the `MAX_SCREENSHOTS = 60` capture cap — the
   prerequisite for genuine full-meeting coverage (disk/privacy assessment
   needed: 60→240 frames ≈ 12→48 MB/hr at 1280px; capture-thread change, so
   deliberately excluded from the delivery PR); configurable budget
   (`screen_context.max_images`); dwell +
   temporal-coverage ranking (separate dimensions); content-type routing on
   existing primitives (`content_type`, call detection: slideshare → keep
   distinct states; in-person → filter hard; live demo → time-sample);
   salience/noise filtering if real summaries show the need; optional
   agent-directed browsing (strategy B) behind config.

## 9. Settled decisions

- **Post-hoc selection over change-triggered capture** — capture stays dumb;
  raw archive supports reprocessing (`redo-*` precedent); acknowledged cost:
  more frames persisted (0600 perms + `keep_after_summary` mitigate).
- **Changed-area *family* over perceptual hashes as decision-maker** (8×8
  hash blindness to same-layout slides) — but the specific keep-rule is a
  harness output, not architecture (§7).
- **Coverage rule governs all delivery**: selection may cover only the
  transcript time range actually present in the model call (§6). Agent-path
  selection must respect the 100k truncation bound; API-path selection stays
  first-8 until chunk-aware delivery.
- **The 100k agent cap stays** (unknowable downstream model contexts make
  unbounded input unsafe for the generic `agent`/`auto` abstraction), but
  silent tail loss is a defect: warn on truncation now, agent map/reduce
  chunking as the durable fix, chunk size chosen by evaluation.
- **Prototype in Rust with contact-sheet output**, not a Python calibrator —
  calibrate once against the pixel pipeline that ships.
- `image` crate already resolves transitively in the lockfile; adding it to
  minutes-core is a new direct dep but no new supply-chain entry.

## 10. Open questions

1. Is nondeterminism acceptable in strategy B (two runs may cite different
   frames)? If not, B stays opt-in.
2. Primary meeting type to optimize defaults for — slideshare/demo
   (visual-heavy, keep aggressively) vs in-person (mostly noise, filter
   hard)? Flips the keep/drop default. (User intent fork.)
3. Cost tolerance: is a per-image caption pass (extra LLM calls) ever
   acceptable for traceability? (User intent fork.)
4. Upstream appetite: file slices 2–3 as one issue or two?
