# Parakeet Engine Setup

Minutes can transcribe with [parakeet.cpp](https://github.com/Frikallo/parakeet.cpp)
instead of Whisper. Parakeet uses NVIDIA's FastConformer architecture — lower word
error rate than Whisper at the same model size, and dramatically faster on Apple
Silicon via Metal. The 110M model matches Whisper large-v3 accuracy at 14× fewer
parameters; the 600M model beats everything in its class and adds 25-language support.

| Engine | Model | Params | LibriSpeech-clean WER | 10s audio, M-series GPU |
|--------|-------|--------|-----------------------|-------------------------|
| Whisper | small (default) | 244M | 3.4% | ~200ms |
| Whisper | medium | 769M | 2.9% | ~600ms |
| Whisper | large-v3 | 1.55B | 2.4% | ~1.5s |
| **Parakeet** | **tdt-ctc-110m** | **110M** | **2.4%** | **~27ms** |
| **Parakeet** | **tdt-600m** | **600M** | **1.7%** | **~520ms** |

This guide is written for **macOS on Apple Silicon**, the primary and
best-supported path. Linux and Windows are covered briefly under
[Other platforms](#other-platforms).

> **New to this?** Read the next section before running anything. The install has a
> few moving parts, and the mental model makes every later step obvious — including
> which large files you can throw away when you're done.

---

## How a Parakeet install is shaped

Parakeet has no installer and no prebuilt binaries yet. You build it from source
once, convert a model once, and point Minutes at the result. A working install has
**three runtime pieces**, produced in **three phases**. Minutes runs the `parakeet`
binary as an external subprocess and points it at converted model files — that's the
whole architecture.

```
  PHASE 1 — BUILD BINARIES            PHASE 2 — INSTALL A MODEL          PHASE 3 — CONFIGURE
  (one time, per machine)             (one time, per model)              (edit one file)

  parakeet.cpp clone ─cmake─┐         minutes setup --parakeet           ~/.config/minutes/
                            ├─► ~/.local/bin/parakeet                      config.toml
                            └─► ~/.local/bin/example-server      │            │
                                                                 └─ extracts ─┤
  minutes repo ──cargo──────► ~/.local/bin/minutes      bundled Silero VAD ──►├─► silero_vad_v5.safetensors
                                                                              │
  HuggingFace ──download──► <model>.nemo ──convert_nemo.py──────────────────►├─► <model>/<model>.safetensors
                            <model>.nemo ──tar extract (tokenizer.vocab)─────►└─► <model>/<model>.tokenizer.vocab

                                                          all of the above land under:
                                                          ~/.minutes/models/parakeet/
```

**What you keep at runtime** (everything else is scaffolding):

| Artifact | Made by | Lives at |
|----------|---------|----------|
| `parakeet` binary | Phase 1 — CMake build of parakeet.cpp | `~/.local/bin/parakeet` |
| `example-server` binary | Phase 1 — same build (warm sidecar for live mode) | `~/.local/bin/example-server` |
| `minutes` binary (with `parakeet` feature) | Phase 1 — `cargo` build, or a signed release | `~/.local/bin/minutes` |
| `silero_vad_v5.safetensors` | Phase 2 — `minutes setup` extracts it (it's bundled inside the `minutes` binary) | `~/.minutes/models/parakeet/` |
| `<model>.safetensors` | Phase 2 — converted from the `.nemo` download | `~/.minutes/models/parakeet/<model>/` |
| `<model>.tokenizer.vocab` | Phase 2 — extracted from the `.nemo` download | `~/.minutes/models/parakeet/<model>/` |

**What is only scaffolding** — needed *during* install, safe to delete *after*:

| Scaffolding | Needed for | Throw away after |
|-------------|-----------|------------------|
| the `parakeet.cpp` clone | Phase 1 (build) **and** Phase 2 (it holds `convert_nemo.py`) | Phase 2 finishes — unless you'll add another model or rebuild the binaries |
| the downloaded `<model>.nemo` (~2.4 GB) | Phase 2 (convert + vocab extract) | conversion finishes |
| the Python venv | Phase 2 (runs the converter) | conversion finishes |

Two facts worth pinning, because they're the ones people get wrong:

- **The `.nemo` download and the `parakeet.cpp` clone are never read at transcription
  time.** They feed Phase 1 and Phase 2 only. The running binaries don't touch them.
- **`minutes setup --parakeet` does *not* download the model.** It writes the VAD
  file, creates the model directory, and prints a recipe. Phase 2's download/convert
  steps are still on you. (This is the single most common point of confusion.)

---

## Before you start (prerequisites)

| Need | Why | Install |
|------|-----|---------|
| **Full Xcode** | Metal needs the full shader compiler — Command Line Tools alone won't do | App Store, then the commands below |
| **CMake** | builds parakeet.cpp | any recent version works (see note) |
| **Rust** | only if you build the `minutes` CLI yourself | [rustup.rs](https://rustup.rs) |
| **Python 3** | one-time model conversion in Phase 2 | already on macOS |

```bash
# Point the toolchain at full Xcode and fetch the Metal compiler:
sudo xcodebuild -license accept
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
xcodebuild -downloadComponent MetalToolchain
```

**A note on CMake versions.** Any recent CMake works — Phase 1's
`-DAXIOM_INSTALL=OFF -DPARAKEET_INSTALL=OFF` flags handle the one common gotcha
(an `install(EXPORT)` strictness error). Verified on 3.31.x, 4.3.2, and 4.3.3.
CMake 3.31.x is the known-good fallback for one *rare*, environment-specific
build failure — see [Troubleshooting](#troubleshooting) if you hit it.

---

## Phase 1 — Build the three binaries

None of these steps need a model — you're just producing executables.

### 1a. Build `parakeet` and `example-server`

Clone parakeet.cpp **outside** the Minutes repo (it's only scaffolding):

```bash
mkdir -p ~/src && cd ~/src
git clone --recursive https://github.com/Frikallo/parakeet.cpp
cd parakeet.cpp

# Configure directly with cmake (not `make build`) so these flags take effect:
#   -DPARAKEET_BUILD_SERVER_EXAMPLE=ON  → builds example-server (off by default)
#   -DAXIOM_INSTALL=OFF -DPARAKEET_INSTALL=OFF → skip the install(EXPORT) rules
#                                                that modern CMake rejects
cmake -B build -DCMAKE_BUILD_TYPE=Release \
  -DPARAKEET_BUILD_SERVER_EXAMPLE=ON \
  -DAXIOM_INSTALL=OFF -DPARAKEET_INSTALL=OFF
cmake --build build -j

# Copy both binaries to a stable location. CMake generators put them in different
# places (Ninja → build/bin/, Unix Makefiles → build/ and build/examples/server/),
# so find them rather than hard-coding a path.
mkdir -p ~/.local/bin
find build -type f -perm -u+x \( -name parakeet -o -name example-server \) \
  -exec cp -f {} ~/.local/bin/ \;
ls -lh ~/.local/bin/parakeet ~/.local/bin/example-server
```

**Why `example-server`?** It's the warm sidecar. Live mode (`minutes record`'s
sidecar and `minutes live`) reuses one loaded model across utterances through it.
Skip it and live mode spawns a fresh `parakeet` subprocess per utterance, reloading
the model each time — visibly slow. Batch transcription doesn't need it.

Optional Apple Silicon linkage check:

```bash
otool -L ~/.local/bin/parakeet | grep -E 'Metal|MPS|MPSGraph|Accelerate'
```

### 1b. Build the `minutes` CLI with Parakeet support

> **Already on the desktop app or a tagged-release CLI?** The DMG and the
> per-platform release CLI binaries already ship the `parakeet` feature — skip the
> `cargo build` below and use the `minutes` you already have. The **one exception**
> is the **Homebrew formula CLI** (`brew install silverstein/tap/minutes`), which is
> Whisper-only: it can still *run* `minutes setup --parakeet` (with a feature-flag
> warning) but won't transcribe with Parakeet itself.

Building the CLI from this repo:

```bash
cd <path/to/your/minutes/checkout>          # e.g. ~/Sites/minutes
export CXXFLAGS="-I$(xcrun --show-sdk-path)/usr/include/c++/v1"   # macOS C++ headers
cargo build --release -p minutes-cli --features parakeet
mkdir -p ~/.local/bin
cp -f target/release/minutes ~/.local/bin/minutes

# Make sure ~/.local/bin is on PATH (add to ~/.zshrc if it isn't):
export PATH="$HOME/.local/bin:$PATH"
which minutes && minutes --version
```

---

## Phase 2 — Install a model

### 2a. Write the bundled VAD file

```bash
minutes setup --parakeet                                  # for tdt-600m (default)
# minutes setup --parakeet --parakeet-model tdt-ctc-110m  # for the 110m model
```

This extracts the Parakeet Silero VAD weights to
`~/.minutes/models/parakeet/silero_vad_v5.safetensors`, creates the model
directory, checks for a `parakeet` binary on PATH, and prints the conversion
recipe. **It does not download the model** — that's the next step.

### 2b. Pick your model

Set these four variables for the model you want. Everything after this block is
identical for both models, so you set the values once and never hand-substitute.

```bash
# --- tdt-600m (multilingual, 25 languages — recommended) ---
MODEL=tdt-600m
HF_REPO=nvidia/parakeet-tdt-0.6b-v3
NEMO=parakeet-tdt-0.6b-v3.nemo
CONVERT=600m-tdt
```

```bash
# --- tdt-ctc-110m (English only, tiny + fastest) ---
MODEL=tdt-ctc-110m
HF_REPO=nvidia/parakeet-tdt_ctc-110m       # note: underscore, not hyphen
NEMO=parakeet-tdt_ctc-110m.nemo
CONVERT=110m-tdt-ctc
```

> ⚠ The HuggingFace assets for the 110m model use an **underscore**
> (`parakeet-tdt_ctc-110m`), but your *local* directory and config use the
> **hyphenated** `tdt-ctc-110m` (which is what `$MODEL` holds). Both conventions
> legitimately appear on the same command line — don't "fix" one to match the other.

### 2c. Download, convert, place

The converter (`scripts/convert_nemo.py`) lives in the `parakeet.cpp` clone, so run
this from inside it. Use a **throwaway Python venv** so `python`, `pip`, and the
`hf` downloader all share one interpreter.

```bash
cd ~/src/parakeet.cpp

# Throwaway venv. numpy is required: convert_nemo.py saves via safetensors, which
# needs numpy, but neither safetensors nor modern PyTorch pulls it in on its own.
python3 -m venv ~/parakeet-convert-env
source ~/parakeet-convert-env/bin/activate
python -m pip install numpy safetensors torch torchaudio huggingface_hub packaging

DEST=~/.minutes/models/parakeet/$MODEL
mkdir -p "$DEST"

# Download the .nemo (~2.4 GB for 600m). hf resumes + integrity-checks.
hf download "$HF_REPO" "$NEMO" --local-dir .

# Convert to safetensors.
python scripts/convert_nemo.py "$NEMO" -o "$DEST/$MODEL.safetensors" --model "$CONVERT"

# Extract the SentencePiece tokenizer.vocab. macOS BSD tar has no --wildcards, so
# capture the exact filename first, then extract by it.
vocab=$(tar tf "$NEMO" | grep -m1 tokenizer.vocab)
tar xf "$NEMO" "$vocab"
cp -f "$vocab" "$DEST/$MODEL.tokenizer.vocab"
# (GNU tar on Linux can do this in one line:
#   tar xf "$NEMO" --wildcards --no-anchored '*tokenizer.vocab')

deactivate
rm -f "$NEMO"             # the .nemo is no longer needed once converted
```

### 2d. You should now have

```text
~/.minutes/models/parakeet/
  silero_vad_v5.safetensors        ← from 2a
  tdt-600m/                        ← $MODEL
    tdt-600m.safetensors           ← from 2c
    tdt-600m.tokenizer.vocab       ← from 2c
```

Phase 2 is done — and so is the scaffolding. See [Clean up](#clean-up).

---

## Phase 3 — Configure

Edit `~/.config/minutes/config.toml`. This is a file edit — don't paste TOML into a
shell.

```toml
[transcription]
engine = "parakeet"                                  # "whisper" (default) or "parakeet"
parakeet_model = "tdt-600m"                          # or "tdt-ctc-110m"
parakeet_vocab = "tdt-600m.tokenizer.vocab"          # match the model from 2c
parakeet_binary = "/Users/you/.local/bin/parakeet"   # absolute path — see note below
parakeet_sidecar_enabled = true                      # reuse the warm example-server in live mode
parakeet_fp16 = true                                 # default on Apple Silicon — ~35% faster
```

**Use an absolute `parakeet_binary` path.** A Finder/Spotlight/Dock-launched
desktop app does not inherit your shell `PATH`, so a bare `parakeet` that works in
Terminal can still fail with "parakeet binary not found" in the app. An absolute
path avoids the whole class of problem. Common locations:
`/Users/you/.local/bin/parakeet`, `/opt/homebrew/bin/parakeet`,
`/usr/local/bin/parakeet`.

Optional tuning keys are listed under [Config reference](#config-reference).

**Desktop app:** Settings → Transcription → Engine → "Parakeet", then choose the
model. Still set `parakeet_binary` to an absolute path for the reason above.

---

## Verify

```bash
test -x ~/.local/bin/parakeet            && echo "parakeet OK"
test -x ~/.local/bin/example-server      && echo "example-server OK"
test -f ~/.minutes/models/parakeet/silero_vad_v5.safetensors          && echo "vad OK"
test -f ~/.minutes/models/parakeet/tdt-600m/tdt-600m.safetensors      && echo "model OK"
test -f ~/.minutes/models/parakeet/tdt-600m/tdt-600m.tokenizer.vocab  && echo "vocab OK"

minutes health
```

Then transcribe a short known file or make a quick test recording and confirm it
runs on Parakeet. If it falls back to Whisper or errors, see
[Troubleshooting](#troubleshooting).

---

## Clean up

Once the binaries are copied and the model is converted, the scaffolding is dead
weight:

```bash
deactivate 2>/dev/null                                # leave the venv if still active
rm -rf ~/parakeet-convert-env                         # the venv — GBs of torch
rm -f  ~/src/parakeet.cpp/parakeet-tdt-0.6b-v3.nemo   # the download — ~2.4 GB
# rm -rf ~/src/parakeet.cpp                            # the clone — see below
```

Keep the `~/src/parakeet.cpp` clone **only if** you expect to install another model
soon (it has `convert_nemo.py`) or rebuild the binaries after an upstream change.
Otherwise it's safe to delete.

**Never delete** the runtime artifacts: `~/.local/bin/parakeet`,
`~/.local/bin/example-server`, and everything under `~/.minutes/models/parakeet/`.

---

## Switching back to Whisper

Set `engine = "whisper"` in `config.toml` (or use the desktop Settings UI). No
rebuild — both engines are compiled in whenever the `parakeet` feature is enabled.

---

# Reference

The rest of this document is reference material — you don't need it to get a working
install.

## Config reference

```toml
[transcription]
engine = "parakeet"              # "whisper" (default) or "parakeet"
parakeet_model = "tdt-600m"      # "tdt-ctc-110m" (English) or "tdt-600m" (multilingual v3)
parakeet_vocab = "tdt-600m.tokenizer.vocab"         # match the model
parakeet_binary = "/Users/you/.local/bin/parakeet"  # absolute path for desktop launches
parakeet_sidecar_enabled = true  # reuse warm example-server socket for live mode
parakeet_fp16 = true             # default on Apple Silicon; ~35% faster, lower GPU memory
parakeet_boost_limit = 25        # experimental: top graph-derived boost phrases (0 disables)
parakeet_boost_score = 2.0       # experimental: parakeet.cpp --boost-score tuning
```

`parakeet_fp16` already defaults to `true`, so listing it documents the default
rather than changing behavior.

Dictation uses Whisper by default because its overlay needs fast mid-utterance
partials. You can opt into Parakeet for the final utterance only:

```toml
[dictation]
backend = "parakeet"
```

Whisper still drives progressive partials; Parakeet transcribes at
VAD-finalization, falling back to Whisper if it's unavailable for an utterance.

## Where things live

```
~/.local/bin/parakeet                  # transcription binary (built in phase 1)
~/.local/bin/example-server            # warm sidecar for live mode (phase 1)
~/.minutes/models/parakeet/silero_vad_v5.safetensors    # Parakeet VAD (from setup)
~/.minutes/models/parakeet/<model>/<model>.safetensors  # model weights (phase 2)
~/.minutes/models/parakeet/<model>/<model>.tokenizer.vocab
```

## The Silero VAD files (not interchangeable)

Both engines do voice-activity detection with Silero, but they load **different
artifacts**, which is why a Parakeet install touches a VAD file even after you set
up Whisper:

| File | Used by |
|------|---------|
| `~/.minutes/models/parakeet/silero_vad_v5.safetensors` | Parakeet (`parakeet.cpp` native VAD) |
| `~/.minutes/models/ggml-silero-v6.2.0.bin` | Whisper path (whisper-rs Silero VAD) |
| `~/.minutes/models/silero-vad-v6.2.0.onnx` | Optional streaming VAD, if built with `vad-ort` |

The Parakeet blob is bundled inside the `minutes` binary and extracted by
`minutes setup --parakeet`. The Whisper ones are downloaded by ordinary
`minutes setup`.

## Language support

| Model | Languages |
|-------|-----------|
| tdt-ctc-110m | English only |
| tdt-600m (v3) | 25 European languages: Bulgarian, Croatian, Czech, Danish, Dutch, English, Estonian, Finnish, French, German, Greek, Hungarian, Italian, Latvian, Lithuanian, Maltese, Polish, Portuguese, Romanian, Russian, Slovak, Slovenian, Spanish, Swedish, Ukrainian |

For languages outside this list, use Whisper (99 languages).

## What Parakeet is wired for (scope)

When `engine = "parakeet"` is set and the running binary has the feature compiled
in, Minutes uses Parakeet for:

- post-recording batch transcription (`minutes process`, desktop processing, the shared cleanup pipeline)
- folder-watcher memo processing
- recording-sidecar live transcription during `minutes record`
- standalone live transcription (`minutes live`, desktop Live Mode)
- final-utterance transcription in dictation when `[dictation] backend = "parakeet"`

Both live paths route each VAD-gated utterance through Parakeet, reusing the warm
`example-server` socket when `parakeet_sidecar_enabled = true` (otherwise spawning a
subprocess per utterance). Parakeet is also the first runtime fallback for the
experimental Apple Speech live path (see [`docs/APPLE_SPEECH.md`](APPLE_SPEECH.md)).

Both live paths still require the `whisper` feature compiled in — Whisper is the
runtime fallback if Parakeet fails mid-session. A `--features parakeet
--no-default-features` build (no whisper) therefore can't run `minutes live`. Since
whisper is a default feature, this only affects unusual build configs.

## Building the desktop app with Parakeet

```bash
TAURI_FEATURES="parakeet" cargo tauri build --bundles app
# or, to keep CLI + app on the same feature set:
MINUTES_BUILD_FEATURES=parakeet,metal ./scripts/build.sh
MINUTES_BUILD_FEATURES=parakeet,metal ./scripts/install-dev-app.sh
```

The `parakeet` feature is opt-in and not in the default build. Whisper is always
compiled in.

## Other platforms

**Linux / Windows (CPU only).** parakeet.cpp builds on CPU but has no CUDA support
yet (WIP in the axiom tensor library), so you lose the speed advantage. The build
and model-install steps above are otherwise the same; GNU tar can use the
`--wildcards` one-liner noted in phase 2. Watch the
[parakeet.cpp repo](https://github.com/Frikallo/parakeet.cpp) for CUDA progress.

**Linux with an NVIDIA GPU (NeMo wrapper, CUDA).** `parakeet_binary` accepts any
executable that follows the parakeet.cpp CLI contract, so you can point it at a
small Python wrapper around NVIDIA's [NeMo toolkit](https://github.com/NVIDIA/NeMo)
and get full CUDA acceleration without waiting on parakeet.cpp CUDA support. This
path was contributed by [@ed0c](https://github.com/silverstein/minutes/issues/122)
(tested on an RTX 3090, CUDA 13.2: a 68-minute French meeting in ~3.5 minutes,
beating Whisper large-v3 on mixed-language audio).

<details>
<summary>NeMo wrapper script + config</summary>

```bash
python3 -m venv ~/parakeet-env
source ~/parakeet-env/bin/activate
pip install nemo_toolkit[asr]
```

Save as `~/bin/parakeet-nemo` and `chmod +x` it:

```bash
#!/bin/bash
source ~/parakeet-env/bin/activate

python3 - "$@" << 'EOF'
import sys
import os
import contextlib

os.environ['PYTORCH_CUDA_ALLOC_CONF'] = 'expandable_segments:True'

audio_files = [a for a in sys.argv[1:] if a.endswith('.wav')]
if not audio_files:
    sys.exit(0)

with contextlib.redirect_stdout(sys.stderr):
    import nemo.collections.asr as nemo_asr
    model = nemo_asr.models.ASRModel.from_pretrained('nvidia/parakeet-tdt-0.6b-v3')
    model = model.cuda()

output = model.transcribe(audio_files, timestamps=True)
for result in output:
    segments = result.timestamp.get('segment', [])
    if segments:
        for seg in segments:
            text = seg['segment'].strip()
            if text:
                sys.stdout.write(f"[{seg['start']:.2f} - {seg['end']:.2f}] {text}\n")
                sys.stdout.flush()
    elif result.text.strip():
        sys.stdout.write(f"[0.00 - 1.00] {result.text.strip()}\n")
        sys.stdout.flush()
EOF
```

```toml
[transcription]
engine = "parakeet"
parakeet_binary = "/home/you/bin/parakeet-nemo"
parakeet_model = "tdt-600m"
parakeet_vocab = "tdt-600m.tokenizer.vocab"
```

**Known limitation:** Minutes invokes the binary once per audio chunk, so the
wrapper reloads the model on every call (~4–5s overhead per chunk). A persistent
daemon that keeps the model resident in VRAM would eliminate this; see
[#122](https://github.com/silverstein/minutes/issues/122) to help land one.

</details>

---

## Troubleshooting

### "parakeet binary not found"
`parakeet` isn't on the launching process's `PATH` (common for Finder/Dock-launched
apps). Set an absolute `parakeet_binary` in `config.toml` (most reliable for desktop
launches), or add its directory to `PATH`.

### "unknown parakeet model"
Only `tdt-ctc-110m` and `tdt-600m` are valid. Check `parakeet_model`.

### "Expected parakeet model in ~/.minutes/models/parakeet/"
`minutes setup --parakeet` installs VAD weights and creates the directory but does
**not** download the model. Run [Phase 2](#phase-2--install-a-model) to create the
files this error is asking for.

### Parakeet "works" but transcription still uses Whisper
Your `minutes` binary was likely built without `--features parakeet` — every
`parakeet_*` config key is silently inert in that case. Rebuild per
[Phase 1b](#1b-build-the-minutes-cli-with-parakeet-support), or use a tagged-release
artifact / the DMG, which ship with the feature. The Homebrew formula CLI is
Whisper-only.

### Build: "requires target hwy that is not in any export set"
Modern CMake tightened `install(EXPORT)`; parakeet.cpp's `axiom` submodule exports
`axiom` but not its `hwy` dependency. You copy the binaries by hand anyway, so skip
the install rules — exactly what the `-DAXIOM_INSTALL=OFF -DPARAKEET_INSTALL=OFF`
flags in Phase 1 do. If you hit this, you likely configured without those flags;
`rm -rf build` and reconfigure with them. Works on any CMake version; no downgrade
needed. (Homebrew no longer ships a `cmake@3` formula regardless.)

### Build: "Neither lock free instructions nor -latomic found"
Environment-sensitive, *not* universal to CMake 4.x — Highway's vendored
`FindAtomics.cmake` try-compile probe fails on some macOS toolchains, and macOS
ships no `libatomic`. We did **not** reproduce it on CMake 4.3.2 or 4.3.3, so build
normally first. If you hit it, either:

- **Use CMake 3.31.x** (known-good). Grab Kitware's tarball and put it first on
  `PATH` for the build shell only, then `rm -rf build` and reconfigure:
  ```bash
  curl -L -o /tmp/cmake.tar.gz \
    https://github.com/Kitware/CMake/releases/download/v3.31.12/cmake-3.31.12-macos-universal.tar.gz
  tar xf /tmp/cmake.tar.gz -C /tmp
  export PATH="/tmp/cmake-3.31.12-macos-universal/CMake.app/Contents/bin:$PATH"
  ```
- **Or patch the probe.** In
  `third_party/axiom/third_party/highway/cmake/FindAtomics.cmake`, short-circuit on
  Apple Silicon (atomics are always lock-free there):
  ```cmake
  if(APPLE AND CMAKE_SYSTEM_PROCESSOR MATCHES "arm64")
    set(ATOMICS_LOCK_FREE_INSTRUCTIONS TRUE)
  else()
    check_cxx_source_compiles("${atomic_code}" ATOMICS_LOCK_FREE_INSTRUCTIONS)
  endif()
  ```

### Build: Metal shader compiler not found
Requires full Xcode, not just Command Line Tools:
```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
xcodebuild -downloadComponent MetalToolchain
```

### `hf: command not found`
The `hf` downloader only exists inside the conversion venv. Activate it and reinstall
if missing:
```bash
source ~/parakeet-convert-env/bin/activate
python -m pip install huggingface_hub
```
It's only needed during model download, not at runtime.

### convert_nemo.py: "No module named 'numpy'" (or other missing package)
`numpy` must be in your venv explicitly — safetensors needs it to save, but neither
safetensors nor modern PyTorch installs it transitively. Reinstall the full
dependency line inside the active venv (2.x numpy is fine):
```bash
python -m pip install numpy safetensors torch torchaudio huggingface_hub packaging
```
