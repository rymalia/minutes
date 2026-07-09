# AI Research on Screenshot Image Processing 

## Prompt:
> I am looking for a computer vision library or module, (js or python or rust), that can programmatically scan a set of images taken sequentially, looking for changes to determine which ones to sample as a representative set. 

## Gemini Response 1

What you are looking for is called **Keyframe Extraction** or **Scene Change Detection**. The goal is to programmatically compare adjacent frames in your sequence and measure their differences. When the difference crosses a certain threshold, the algorithm flags the image as a new "representative" frame.

Here are the best approaches depending on your language of choice.

### 1. Python (Recommended)

Python has the most robust ecosystem for computer vision. The standard way to compare sequential images is by calculating the **Structural Similarity Index (SSIM)** using `scikit-image` and `OpenCV`. SSIM is highly effective because it measures the *perceived* visual change rather than just doing a raw pixel-to-pixel mathematical comparison.

```python
from skimage.metrics import structural_similarity as ssim
import cv2
import glob

# Load all sequentially named images from a directory
image_files = sorted(glob.glob('sequence/*.jpg'))
previous_image = cv2.imread(image_files[0], cv2.IMREAD_GRAYSCALE)
representative_frames = [image_files[0]]

for file in image_files[1:]:
    current_image = cv2.imread(file, cv2.IMREAD_GRAYSCALE)
    
    # Calculate SSIM (returns a score from -1.0 to 1.0)
    score, _ = ssim(previous_image, current_image, full=True)
    
    # A score closer to 1 means the images are identical.
    # If the score drops below our threshold, a significant change occurred.
    if score < 0.60: 
        representative_frames.append(file)
        # Update the baseline to the new scene
        previous_image = current_image

print(f"Extracted {len(representative_frames)} representative frames.")

```

### 2. JavaScript / Node.js

If you prefer a web stack, you can use **Jimp** (an image processing library) alongside **Pixelmatch** (a fast, lightweight pixel-level comparison tool).

Setting up a Node environment from scratch can sometimes feel finicky with package managers and configuration files, so here is the exact setup to get this running successfully:

**Environment Setup:**

1. Open your terminal in your project folder and initialize the package environment:
```bash
npm init -y

```


2. Install the necessary dependencies via `npm`:
```bash
npm install jimp pixelmatch pngjs

```



**The Code (`extractor.js`):**

```javascript
const Jimp = require('jimp');
const pixelmatch = require('pixelmatch');

async function extractKeyframes(imagePaths) {
  let repFrames = [imagePaths[0]];
  let prevImg = await Jimp.read(imagePaths[0]);
  const { width, height } = prevImg.bitmap;

  for (let i = 1; i < imagePaths.length; i++) {
    let currImg = await Jimp.read(imagePaths[i]);
    
    // Pixelmatch returns the exact number of mismatched pixels
    const numDiffPixels = pixelmatch(
      prevImg.bitmap.data, 
      currImg.bitmap.data, 
      null, // We don't need to output a visual diff image
      width, 
      height, 
      { threshold: 0.1 } // Ignore minor color variations
    );

    const diffPercentage = numDiffPixels / (width * height);

    // If more than 15% of the pixels changed, save it as a new scene
    if (diffPercentage > 0.15) {
      repFrames.push(imagePaths[i]);
      prevImg = currImg;
    }
  }
  return repFrames;
}

```

### 3. Rust

For raw speed and memory safety—especially if you have tens of thousands of high-resolution images—Rust is excellent. You can leverage the `image` crate alongside the `image-compare` crate.

Add these to your `Cargo.toml`:

```toml
[dependencies]
image = "0.24"
image-compare = "0.3"
```

You can then use `image_compare::ssim::ssim` or `image_compare::Metric::RootMeanSquare` to evaluate the structural integrity between two `DynamicImage` buffers, keeping frames that fall below your target similarity score.

---

### Tuning for Your Subject Matter

The most critical part of this process is calibrating your threshold (the `0.60` in the Python script or `0.15` in the JS script).

If you are analyzing fast-paced action—like recording a volleyball match where players and the ball are constantly darting across the frame—a highly sensitive threshold will flag almost every single image as a "change." You will need to lower the sensitivity so the script only captures major camera pans, cutaways, or entirely new plays. Conversely, if you are scanning a slow-moving nature time-lapse, you will want high sensitivity to catch subtle shifts in lighting or growth.

--- 

## Codex Response 1

The strongest fit is **Python + PySceneDetect**. It compares adjacent frames and detects meaningful visual changes. Although designed for video, its detectors can process image frames directly. `ContentDetector` handles normal cuts; `AdaptiveDetector` is better when camera motion causes noise. [PySceneDetect docs](https://www.scenedetect.com/docs/latest/)

Other good options:

- **OpenCV** — best when you need custom rules. Compare consecutive images using resized HSV histograms, SSIM, or perceptual hashes, then retain a frame when its difference exceeds a threshold.
- **Python `imagehash` / Rust `imagehash`** — simplest for removing near-duplicates. Keep the first image, then keep later images whose pHash Hamming distance from the last selected image exceeds a threshold. [Rust imagehash](https://docs.rs/imagehash/latest/imagehash/)
- **FFmpeg scene detection** — fastest turnkey approach if the numbered images can be treated as a video/image sequence. Its `select` filter exposes a scene-change score and can extract only qualifying frames. [FFmpeg filters](https://www.ffmpeg.org/ffmpeg-filters.html)
- **CLIP/DINO embeddings + k-medoids** — best when “representative” means semantically diverse rather than merely pixel-different. More compute, but resistant to lighting, crop, and minor camera movement.

My practical recommendation:

1. Resize images to roughly 256–512 px.
2. Compute an HSV/content difference between each adjacent pair.
3. Split the sequence wherever the score exceeds a threshold.
4. Select the middle or sharpest image from each resulting segment.
5. Enforce a maximum interval so long, gradually changing segments still get sampled.

Avoid comparing every image only with its immediate predecessor when changes accumulate slowly. Compare against the **last selected image**, or combine both scores.

For screenshots or a fixed camera, start with OpenCV/SSIM or pHash. For edited footage, use PySceneDetect. For photos with camera movement, use embeddings.

---


## Codex Response 2

Yes—**SSIM with OpenCV/scikit-image is a strong baseline**, especially for screenshots, document scans, fixed cameras, or UI captures.

One correction: SSIM measures similarity in **luminance, contrast, and local structure**. It correlates better with visual perception than raw pixel difference, but it does not understand semantic importance. A blinking cursor or camera shift can score as change; a meaningful small-region update may barely affect the global score.

A robust selector should:

```python
score = ssim(previous_gray, current_gray, data_range=255)

if score < threshold:
    select(current)
```

But I would improve it with:

- Resize and grayscale consistently.
- Apply slight Gaussian blur to suppress compression noise.
- Compare with the **last selected frame**, not only the immediately preceding frame. This catches gradual accumulated change.
- Optionally compare adjacent frames too, to detect abrupt changes.
- Add minimum and maximum sampling intervals.
- Select the sharpest or midpoint frame after detecting a transition.
- Use regional/tiled SSIM if small localized changes matter.

Typical starting thresholds:

- `SSIM < 0.95`: fairly sensitive.
- `SSIM < 0.90`: moderate visual change.
- `SSIM < 0.80`: substantial change.

These are dataset-dependent and should be calibrated from actual sequences.

SSIM becomes unreliable when images contain camera movement, resizing, rotation, exposure changes, animated backgrounds, or overlays. For those cases, align frames first with OpenCV feature matching, or use perceptual hashes/CLIP embeddings.

My recommendation: begin with **OpenCV preprocessing + scikit-image SSIM + last-selected-frame comparison**. It is simple, interpretable, inexpensive, and likely sufficient unless the sequence has camera motion or requires semantic diversity.

## Claude Fable Response 1

This is a classic "keyframe extraction" / scene-change detection problem, and there are a few solid options depending on how heavy you want to go.

**Python (best ecosystem for this)**

The most direct fit is probably **PySceneDetect** — it's designed for exactly this workflow on video, but its content-aware detector (HSV-space frame diffing with a threshold) works on image sequences too, and it hands you back the representative frames. If your images are a burst/timelapse rather than video frames, you can still feed them through as a sequence.

For a lighter DIY approach, two libraries cover 95% of use cases:

- **OpenCV** (`opencv-python`) — compute frame-to-frame difference with `cv2.absdiff` on grayscale/blurred versions, or compare HSV histograms with `cv2.compareHist`. Sample a frame whenever the diff score crosses a threshold.
- **scikit-image** — `skimage.metrics.structural_similarity` (SSIM) gives you a perceptually meaningful 0–1 similarity score between consecutive images. More robust to noise/lighting flicker than raw pixel diffs.

A third option that's surprisingly effective and very fast: **imagehash** (perceptual hashing). Compute a phash for each image, and sample whenever the Hamming distance from the last *sampled* image exceeds N bits. This is great when you want "representative set" semantics rather than "detect every change," because you're always comparing against your last kept frame, not the previous frame:

```python
import imagehash
from PIL import Image

kept = []
last_hash = None
for path in sorted(image_paths):
    h = imagehash.phash(Image.open(path))
    if last_hash is None or (h - last_hash) > 8:  # tune threshold
        kept.append(path)
        last_hash = h
```

That compare-against-last-kept pattern matters — naive consecutive diffing misses slow gradual changes (each step is below threshold, but the cumulative drift is huge).

**Rust**

- **img_hash** crate — same perceptual hashing approach, very fast.
- **opencv** crate (bindings) if you want the full absdiff/histogram toolkit, though the build setup is heavier.
- **image** + **imageproc** for hand-rolled pixel diffing without native deps.

**JS/Node**

Weakest of the three for this, but workable: **sharp** for fast decoding/resizing plus **pixelmatch** or **blockhash-core** for comparison. If you're already in a Node/TS codebase this is fine for phash-style sampling; I'd avoid opencv.js in Node (WASM, clunky API).

**My recommendation:** if this is a standalone processing script, Python with `imagehash` for the simple case, or SSIM via scikit-image if you need sensitivity to structural changes with tolerance for exposure/noise variation. If the images are actually video frames, just use PySceneDetect (or even `ffmpeg -vf "select='gt(scene,0.3)'"` and skip the library entirely).

What's the source material — timelapse, security cam stills, screenshots? That changes which comparison metric behaves best (e.g., screenshots want exact-ish diffing, outdoor timelapses need lighting robustness).

--- 

# Specific to Computer Screenshots

## Prompt:
> And what if the requirement stipulated this would only be used for computer screenshots, full-screen captures taken during regular use and taken during video conference calls and slideshares. Would that change any of the recommendations?

## Gemini Response 2

Yes, this constraint changes almost everything. It shifts the entire architectural strategy because digital screenshots possess completely different physical properties than camera footage.

If your domain is purely UI screenshots, slideshares, and video calls, here is exactly how your pipeline needs to pivot.

### 1. Throw Out the Sharpness Check 

You can completely scrap the Laplacian variance calculation we just built.

Screenshots do not suffer from focal blur, lens distortion, or camera shake. A screenshot of a webpage is mathematically perfectly sharp. Even a heavily compressed video call still has perfectly sharp UI borders around the video window.

**The new Step 4:** Instead of looking for the "sharpest" frame in a segment, just take the **first frame** immediately following the threshold break. In a digital environment, state changes (like switching a tab or moving to the next slide) are instantaneous. The first frame of the new state is your most accurate representative image.

### 2. The "Talking Head" Trap

This is the biggest edge case for your specific requirement.

If a user is on a Zoom call or watching a webinar, 90% of the screen is a static slide or application. But there is a small 200x200 pixel box where a person is constantly moving and talking.

If you use a basic pixel-to-pixel comparison, that tiny talking head will trigger a "new scene" every single second because the pixels are changing rapidly, even though the actual *context* of the screen (the slide) hasn't changed.

**The Solution:**

* **Heavy Downsampling:** Resize the images down to something extreme, like 64x64 or 128x128 pixels, before comparing. This acts as a mathematical blur. The tiny movements of a person's mouth or hands in a PiP window will average out and be ignored, but a massive shift—like changing to a completely new slide or opening a new application window—will still trigger the threshold.
* **Structural Similarity (SSIM):** SSIM is perfect here. It looks at the structural structure of the image (blocks of text, window borders) rather than raw color values. A moving face inside a fixed square border won't significantly alter the overall structural score of the fullscreen capture.

### 3. PySceneDetect is Overkill; pHash is King

You can drop PySceneDetect and any AI embeddings (CLIP/DINO). They are too heavy, require too much compute, and are designed to understand real-world 3D environments, not 2D digital interfaces.

For full-screen computer captures, **Perceptual Hashing (pHash)** is the undisputed best tool.

A perceptual hash converts an image into a short string of text (a hash) based on its visual frequencies.

1. Two identical screenshots generate the exact same hash.
2. A screenshot with a blinking cursor will generate a hash with a Hamming distance of maybe 1 or 2 from the previous frame.
3. Switching from a web browser to an IDE will generate a completely different hash with a massive Hamming distance.

It is incredibly fast, computationally cheap, and entirely unaffected by minor UI animations.

### The Revised 5-Step Pipeline for Screenshots

If you are building this for digital screen captures, your architecture should look like this:

1. **Downsample aggressively** (e.g., resize to 128x128 or even 64x64) and convert to grayscale.
2. **Compute the Perceptual Hash (pHash)** of the current frame.
3. Compare the current hash against the **hash of the last selected image** (The "Last Selected Image" rule still applies here to catch slow scrolling).
4. **Calculate the Hamming Distance.** If the distance exceeds a very low threshold (meaning the UI structurally changed), save the *current* frame as a new representative image.
5. **Enforce a maximum interval** (e.g., save a frame every 5 minutes regardless of UI changes, just as a heartbeat log).

--- 

## Codex Response 3

Yes. For full-screen computer captures, I would recommend **local OpenCV + scikit-image SSIM**, but with screenshot-specific logic. Generic scene-cut detection would over-sample video calls because faces and webcam tiles move constantly.

Use this pipeline:

1. Normalize resolution and color.
2. Mask volatile regions when known:
   - Webcam tiles
   - Clocks
   - Cursor
   - Notifications
   - Animated indicators
3. Divide the screen into tiles and compute SSIM per tile.
4. Weight text-heavy/static regions more heavily than video regions.
5. Require a change to persist for 2–3 captures before selecting it.
6. Compare against both:
   - Previous frame: detects abrupt transitions.
   - Last selected frame: detects gradual accumulated changes.
7. Enforce minimum and maximum sampling intervals.

For this workload, the important distinction is:

| Screen content | Best approach |
|---|---|
| Normal desktop/application use | Tiled SSIM |
| Slide presentations | SSIM or perceptual hash over the slide region |
| Video call with shared slides | Mask participant tiles; analyze shared-content region |
| Full-screen speaker video | Time-based sampling plus face/pose diversity, not SSIM alone |
| Documents/web pages scrolling | SSIM plus scroll detection or image alignment |

A useful selection rule would be:

```text
select if:
  weighted_changed_area > 15%
  AND change persists for 2 frames
  AND minimum interval has elapsed

also select if:
  maximum interval has elapsed
```

I would avoid relying on one global SSIM number. A small but important dialog may affect only 5% of the screen, while an unimportant webcam tile may change continuously. A tiled change map lets you distinguish these cases.

For slide sharing, add an edge/text-oriented comparison. Converting to grayscale and emphasizing edges makes slide changes prominent while reducing sensitivity to webcam motion and minor color fluctuations. OCR can provide another strong signal: select a frame when the visible text changes substantially.

Everything can remain entirely local:

- `opencv-python`
- `scikit-image`
- Optional `pytesseract` for slide/document text
- Optional MediaPipe for detecting and masking faces/video tiles

So the revised recommendation is: **tiled SSIM + volatile-region masking + persistence/debouncing**, with OCR or perceptual hashing as a secondary signal for slides. PySceneDetect becomes less attractive because this is mixed desktop content rather than conventional edited video.

--- 

## Claude Fable Response 2

Yes — screenshots meaningfully change the calculus, in both directions.

**What gets easier:** no sensor noise, no lighting drift, no compression grain (assuming lossless captures). That means you don't need SSIM's noise tolerance, and plain pixel differencing becomes viable and *precise*. `cv2.absdiff` → threshold → count changed pixels is now a legitimate primary strategy rather than a crude one.

**What gets harder:** screenshots are full of small, constantly-changing regions that are semantically meaningless:

- The clock in the menu bar / taskbar
- Cursor position, text caret blink
- Notification badges, spinners, progress bars
- And the big one for your video-call case: **webcam thumbnails**. A gallery strip of participant videos changes every single frame, so naive consecutive diffing will fire constantly even when the shared slide hasn't changed at all.

This pushes the recommendation from "global similarity score" toward **changed-area analysis**:

1. Diff consecutive (or last-kept vs. current) frames per-pixel.
2. Threshold to a binary change mask.
3. Sample based on **what fraction of the screen changed** and/or **where** — a slide transition changes 60–90% of the pixels in one large contiguous block; talking heads and clocks change 2–5% in small scattered regions.

```python
import cv2
import numpy as np

def change_fraction(img_a, img_b, pixel_thresh=25):
    a = cv2.cvtColor(img_a, cv2.COLOR_BGR2GRAY)
    b = cv2.cvtColor(img_b, cv2.COLOR_BGR2GRAY)
    diff = cv2.absdiff(a, b)
    mask = diff > pixel_thresh
    return mask.mean()  # fraction of screen that changed

# sample when > ~0.15–0.30, tune to taste
```

Refinements that matter for your specific scenario:

- **Mask known noisy regions.** Zero out the menu bar/taskbar rows and, if the video-call layout is predictable (Zoom/Meet gallery strip on the right or bottom), mask that too. Even a crude static mask kills most false positives.
- **Morphological cleanup** (`cv2.morphologyEx` with open/dilate) on the change mask, then look at the **largest connected component** via `cv2.connectedComponentsWithStats`. "One big changed region" = slide change; "many tiny regions" = webcam jitter. This distinction is nearly free and very discriminative.
- **Compare against last-kept frame**, same as before — during screen shares people scroll gradually, and consecutive diffs under-report.

**On perceptual hashing:** it drops in value here. Default phash/dhash operates on an 8×8 or 16×16 reduction, which can completely miss a slide change where two text-heavy slides share the same layout (title bar, bullet structure, logo) — visually distinct to a human, nearly identical at 8×8. If you want hashing for speed, bump to `hash_size=16` or 32, but honestly full-res absdiff on screenshots is fast enough (a 2560×1440 diff in OpenCV is ~a millisecond) that there's little reason to trade away precision.

**Library recommendation update:** Python + OpenCV alone now covers everything — you no longer need scikit-image or imagehash. In Rust, `image` + `imageproc` handles the same pipeline (absdiff, thresholding, connected components) without OpenCV's build pain, and screenshots-only means you don't miss OpenCV's fancier metrics. In Node, `sharp` to decode + a simple typed-array diff loop is fine, since the algorithm is now trivial.

One more thought given the video-call requirement: if the goal is "representative set of what was presented," you might also want a cheap heuristic for *ignoring frames where no screen share is active* (full-screen gallery view of faces). High change-fraction spread across many small regions frame after frame is a good signature for that state — same connected-components analysis, reused as a classifier.

Is the sampling happening live during capture, or as a batch pass afterward? Live changes the perf budget and lets you cheat with things like "diff every Nth capture first, then refine."
