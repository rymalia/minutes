# Parakeet Engine Setup

Minutes can transcribe with [parakeet.cpp](https://github.com/Frikallo/parakeet.cpp)
instead of Whisper. Parakeet uses NVIDIA's FastConformer architecture — lower word
error rate than Whisper at the same model size, and dramatically faster on Apple
Silicon via Metal. The 110M model matches Whisper large-v3 accuracy at 14× fewer
parameters; the 600M model beats everything in its class.

| Engine | Model | Params | LibriSpeech-clean WER | 10s audio, M-series GPU |
|--------|-------|--------|-----------------------|-------------------------|
| Whisper | small (default) | 244M | 3.4% | ~200ms |
| Whisper | large-v3 | 1.55B | 2.4% | ~1.5s |
| **Parakeet** | **tdt-ctc-110m** | **110M** | **2.4%** | **~27ms** |
| **Parakeet** | **tdt-600m** | **600M** | **1.7%** | **~520ms** |

> **New to this?** Read the next section before running anything. The install has
> a few moving parts, and the mental model makes every later step obvious — including
> which large files you can throw away when you're done.

---

## How a Parakeet install is shaped

A working install has **three runtime pieces**, produced in **three phases**.
Minutes itself runs the `parakeet` binary as an external subprocess and points it
at converted model files — that's the whole architecture.

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

## Choose your model

Everything below is written for **`tdt-600m`** — the recommended multilingual
path (25 European languages), validated end to end. If you want the compact
**English-only `tdt-ctc-110m`** instead, run the same steps but substitute these
five values wherever they appear:

| Where it appears | `tdt-600m` (default below) | `tdt-ctc-110m` |
|------------------|----------------------------|----------------|
| HF repo | `nvidia/parakeet-tdt-0.6b-v3` | `nvidia/parakeet-tdt_ctc-110m` |
| `.nemo` filename | `parakeet-tdt-0.6b-v3.nemo` | `parakeet-tdt_ctc-110m.nemo` ⚠ underscore |
| `convert_nemo.py --model` | `600m-tdt` | `110m-tdt-ctc` |
| local model dir / file stem | `tdt-600m` | `tdt-ctc-110m` |
| vocab filename | `tdt-600m.tokenizer.vocab` | `tdt-ctc-110m.tokenizer.vocab` |

> ⚠ The HuggingFace assets for the 110m model use an **underscore**
> (`parakeet-tdt_ctc-110m`), but your *local* directory and config use the
> **hyphenated** `tdt-ctc-110m`. Both conventions legitimately appear on the same
> command line. Don't "fix" one to match the other.

---

## Phase 1 — Build the three binaries

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

# Copy both binaries to a stable location. CMake generators put them in
# different places (Ninja → build/bin/, Unix Makefiles → build/ and
# build/examples/server/), so find them rather than hard-coding a path.
mkdir -p ~/.local/bin
find build -type f -perm -u+x \( -name parakeet -o -name example-server \) \
  -exec cp -f {} ~/.local/bin/ \;
ls -lh ~/.local/bin/parakeet ~/.local/bin/example-server
```

`example-server` is the **warm sidecar**. Live mode (`minutes live` and the
recording sidecar) reuses one loaded model across utterances through it. Skip it
and live mode spawns a fresh `parakeet` subprocess per utterance, reloading the
model each time — visibly slow.

### 1b. Build the `minutes` CLI with Parakeet support

Skip this if your signed desktop app release already ships the `parakeet`
feature. (The Homebrew CLI is usually Whisper-only — it can run
`minutes setup --parakeet`, but it shouldn't be the binary doing transcription.)

```bash
cd <path/to/your/minutes/checkout>          # e.g. ~/Sites/minutes
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
minutes setup --parakeet
```

This extracts the Parakeet Silero VAD weights to
`~/.minutes/models/parakeet/silero_vad_v5.safetensors`, creates the model
directory, checks for a `parakeet` binary on PATH, and prints the conversion
recipe. **It does not download the model** — that's the next step.

### 2b. Download and convert the model

Use a throwaway Python venv so `python`, `pip`, and the `hf` downloader all share
one interpreter:

```bash
python3 -m venv ~/parakeet-convert-env
source ~/parakeet-convert-env/bin/activate
python -m pip install numpy safetensors torch torchaudio huggingface_hub packaging
```

> **`numpy` is not optional.** `convert_nemo.py` saves via
> `safetensors.torch.save_file()`, which needs numpy — but safetensors declares
> numpy only as an *optional* extra, and modern PyTorch no longer pulls it in.
> Omit it and conversion dies at the save step with `ModuleNotFoundError: numpy`.
> numpy 2.x is fine.

Run the conversion from inside the clone (it has `scripts/convert_nemo.py`, and
keeping the `.nemo` here means every path resolves in one directory):

```bash
cd ~/src/parakeet.cpp
hf download nvidia/parakeet-tdt-0.6b-v3 parakeet-tdt-0.6b-v3.nemo --local-dir .

mkdir -p ~/.minutes/models/parakeet/tdt-600m
python scripts/convert_nemo.py parakeet-tdt-0.6b-v3.nemo \
  -o ~/.minutes/models/parakeet/tdt-600m/tdt-600m.safetensors \
  --model 600m-tdt
```

### 2c. Extract the tokenizer vocab

parakeet.cpp needs the SentencePiece `tokenizer.vocab`, not a plain `vocab.txt`.
macOS BSD `tar` has no `--wildcards`, so capture the exact filename first, then
extract by it:

```bash
vocab=$(tar tf parakeet-tdt-0.6b-v3.nemo | grep -m1 tokenizer.vocab)
tar xf parakeet-tdt-0.6b-v3.nemo "$vocab"
cp -f "$vocab" ~/.minutes/models/parakeet/tdt-600m/tdt-600m.tokenizer.vocab
# GNU tar (Linux) can do this in one line:
#   tar xf parakeet-tdt-0.6b-v3.nemo --wildcards --no-anchored '*tokenizer.vocab'
```

### 2d. You should now have

```text
~/.minutes/models/parakeet/
  silero_vad_v5.safetensors        ← from 2a
  tdt-600m/
    tdt-600m.safetensors           ← from 2b
    tdt-600m.tokenizer.vocab       ← from 2c
```

Phase 2 is done — and so is the scaffolding. See [Clean up](#clean-up).

---

## Phase 3 — Configure Minutes

Edit `~/.config/minutes/config.toml` (this writes to a file — don't paste it into
a shell):

```toml
[transcription]
engine = "parakeet"                                  # "whisper" (default) or "parakeet"
parakeet_model = "tdt-600m"                          # or "tdt-ctc-110m"
parakeet_binary = "/Users/you/.local/bin/parakeet"   # absolute path — see note below
parakeet_vocab = "tdt-600m.tokenizer.vocab"          # match the file from 2c
parakeet_sidecar_enabled = true                      # reuse the warm example-server in live mode
parakeet_fp16 = true                                 # default on Apple Silicon — ~35% faster
```

**Use an absolute `parakeet_binary` path.** Apps launched from Finder, Spotlight,
or the Dock may not inherit your shell `PATH`, so `which parakeet` can succeed in
Terminal while the desktop app fails with "parakeet binary not found." Common
locations: `/Users/you/.local/bin/parakeet`, `/opt/homebrew/bin/parakeet`,
`/usr/local/bin/parakeet`.

**Desktop app:** Settings → Transcription → Engine → "Parakeet", then pick the
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

Then transcribe a short known file or make a quick test recording. Switching back
to Whisper later is just `engine = "whisper"` in the config — no rebuild, both
engines are compiled in.

---

## Clean up

Once the binaries are copied and the model is converted, the scaffolding is dead
weight:

```bash
deactivate 2>/dev/null                          # leave the venv
rm -rf ~/parakeet-convert-env                   # ~ GBs of torch
rm -f  ~/src/parakeet.cpp/parakeet-tdt-0.6b-v3.nemo   # ~2.4 GB
# rm -rf ~/src/parakeet.cpp                      # the clone — see below
```

Keep the `~/src/parakeet.cpp` clone **only if** you expect to install another
model soon (it has `convert_nemo.py`) or rebuild the binaries after an upstream
change. Otherwise it's safe to delete.

**Never delete** the runtime artifacts: `~/.local/bin/parakeet`,
`~/.local/bin/example-server`, and everything under
`~/.minutes/models/parakeet/`.

---

# Reference

The rest of this document is reference material — you don't need it to get a
working install.

## Where Parakeet is used

When `engine = "parakeet"` is set and the binary was built with the feature,
Minutes uses Parakeet for:

- post-recording batch transcription (`minutes process`, desktop processing, the shared cleanup pipeline)
- folder-watcher memo processing
- recording-sidecar live transcription during `minutes record`
- standalone live transcription (`minutes live` and desktop Live Mode)
- final-utterance transcription in dictation when `[dictation] backend = "parakeet"`

**Live mode wants the warm sidecar.** Set `parakeet_sidecar_enabled = true` and
keep `example-server` discoverable (on `PATH` or via
`MINUTES_PARAKEET_SERVER_BINARY`). Without it, every utterance pays full
subprocess startup.

**Dictation stays Whisper by default** because its overlay depends on fast
mid-utterance partials. With `[dictation] backend = "parakeet"`, Whisper still
drives progressive partials and Parakeet handles the final utterance; if Parakeet
is unavailable, that utterance falls back to Whisper.

**Whisper is the runtime fallback.** Both live paths still require the `whisper`
Cargo feature compiled in — it's the fallback when Parakeet fails mid-session.
A `--features parakeet --no-default-features` build (no whisper) therefore can't
run `minutes live`. Whisper is a default feature, so this only bites unusual
build configs.

Parakeet is also the **first runtime fallback** behind the experimental Apple
Speech standalone-live path: if `engine = "apple-speech"` can't run or fails
mid-session, Minutes tries a ready Parakeet backend before Whisper. See
[`docs/APPLE_SPEECH.md`](APPLE_SPEECH.md).

## Language support

| Model | Languages |
|-------|-----------|
| `tdt-ctc-110m` | English only |
| `tdt-600m` (v3) | 25 European languages: Bulgarian, Croatian, Czech, Danish, Dutch, English, Estonian, Finnish, French, German, Greek, Hungarian, Italian, Latvian, Lithuanian, Maltese, Polish, Portuguese, Romanian, Russian, Slovak, Slovenian, Spanish, Swedish, Ukrainian |

For anything outside this list, use Whisper (99 languages).

## The VAD files (they are not interchangeable)

A complete Minutes install can carry several Silero VAD artifacts:

| File | Used by |
|------|---------|
| `~/.minutes/models/parakeet/silero_vad_v5.safetensors` | Parakeet / parakeet.cpp native VAD |
| `~/.minutes/models/ggml-silero-v6.2.0.bin` | Whisper path / whisper-rs Silero VAD |
| `~/.minutes/models/silero-vad-v6.2.0.onnx` | Optional streaming VAD if built with `vad-ort` |

`minutes setup --parakeet` writes only the first. Plain `minutes setup` downloads
the Whisper VAD artifacts.

## Full set of `[transcription]` keys

```toml
[transcription]
engine = "parakeet"
parakeet_model = "tdt-600m"
parakeet_binary = "/Users/you/.local/bin/parakeet"
parakeet_vocab = "tdt-600m.tokenizer.vocab"
parakeet_sidecar_enabled = true
parakeet_fp16 = true              # default on Apple Silicon: ~35% faster, lower GPU memory
parakeet_boost_limit = 25         # experimental: top graph-derived boost phrases (0 disables)
parakeet_boost_score = 2.0        # experimental tuning for parakeet.cpp --boost-score
```

## Building the desktop app with Parakeet

```bash
TAURI_FEATURES="parakeet" cargo tauri build --bundles app
```

In this repo, prefer the helper scripts so the CLI and desktop app stay on the
same feature set:

```bash
MINUTES_BUILD_FEATURES=parakeet,metal ./scripts/build.sh
MINUTES_BUILD_FEATURES=parakeet,metal ./scripts/install-dev-app.sh
```

The `parakeet` feature is opt-in; Whisper is always compiled in. Both engines
coexist in one binary, and the config file selects which one runs.

## Linux / Windows (CPU only)

parakeet.cpp has no CUDA support yet (WIP in the axiom tensor library). CPU-only
builds work but lose the speed advantage. Watch the
[parakeet.cpp repo](https://github.com/Frikallo/parakeet.cpp) for CUDA.

## Linux with an NVIDIA GPU (NeMo wrapper)

`parakeet_binary` accepts any executable that follows the parakeet.cpp CLI
contract, so on Linux you can point Minutes at a small Python wrapper around
NVIDIA's [NeMo toolkit](https://github.com/NVIDIA/NeMo) for full CUDA
acceleration — no waiting on parakeet.cpp CUDA. Contributed by
[@ed0c](https://github.com/silverstein/minutes/issues/122); tested on an RTX 3090
(CUDA 13.2), a 68-minute French meeting in ~3.5 minutes, beating Whisper large-v3
on mixed-language audio.

```bash
python3 -m venv ~/parakeet-env
source ~/parakeet-env/bin/activate
pip install nemo_toolkit[asr]
```

Save as `~/bin/parakeet-nemo` and `chmod +x`:

```bash
#!/bin/bash
source ~/parakeet-env/bin/activate

python3 - "$@" << 'EOF'
import sys, os, contextlib

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

Point Minutes at it with `parakeet_binary = "/home/you/bin/parakeet-nemo"`.
**Known limitation:** the wrapper reloads the model on every chunk (~4–5s
overhead each). A persistent daemon that keeps the model in VRAM removes this;
see [#122](https://github.com/silverstein/minutes/issues/122) to help land one.

---

## Troubleshooting

### "parakeet binary not found"
The binary isn't on the launching process's `PATH` (common for Finder/Dock-launched
apps). Set an absolute `parakeet_binary` in config, or add the location to `PATH`.

### "unknown parakeet model"
Only `tdt-600m` and `tdt-ctc-110m` are supported. Check `parakeet_model`.

### "Expected parakeet model in ~/.minutes/models/parakeet/"
`minutes setup --parakeet` wrote the VAD file and created the directory, but the
converted model files are missing. Run [Phase 2](#phase-2--install-a-model).

### CMake export-set error: "requires target hwy that is not in any export set"

```
CMake Error in third_party/axiom/CMakeLists.txt:
  install(EXPORT "AxiomTargets" ...) includes target "axiom" which requires
  target "hwy" that is not in any export set.
```

Modern CMake tightened `install(EXPORT)` rules; axiom exports `axiom` but not its
`hwy` dependency. You copy binaries by hand anyway, so skip the install rules —
which Phase 1 already does via `-DAXIOM_INSTALL=OFF -DPARAKEET_INSTALL=OFF`. If
you hit this, you likely configured without those flags; `rm -rf build` and
reconfigure with them. Works on any CMake version — **no downgrade needed**.

### Atomics error: "Neither lock free instructions nor -latomic found" (build)

Environment-specific, *not* universal to CMake 4.x — we did not reproduce it on
4.3.2 or 4.3.3, so build normally first. Highway's vendored `FindAtomics.cmake`
runs a try-compile probe that fails on some macOS toolchains, and macOS ships no
`libatomic`. If you hit it, either:

**Option A — use CMake 3.31.x** for the build shell:

```bash
curl -L -o /tmp/cmake-3.31.12.tar.gz \
  https://github.com/Kitware/CMake/releases/download/v3.31.12/cmake-3.31.12-macos-universal.tar.gz
tar xf /tmp/cmake-3.31.12.tar.gz -C /tmp
export PATH="/tmp/cmake-3.31.12-macos-universal/CMake.app/Contents/bin:$PATH"
cmake --version
```

Then `rm -rf build` and reconfigure.

**Option B — patch the probe.** In
`third_party/axiom/third_party/highway/cmake/FindAtomics.cmake`, short-circuit on
Apple Silicon (where atomics are always lock-free):

```cmake
if(APPLE AND CMAKE_SYSTEM_PROCESSOR MATCHES "arm64")
  set(ATOMICS_LOCK_FREE_INSTRUCTIONS TRUE)
else()
  check_cxx_source_compiles("${atomic_code}" ATOMICS_LOCK_FREE_INSTRUCTIONS)
endif()
```

### Metal shader compiler not found (build)
Requires full Xcode, not just Command Line Tools:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
xcodebuild -downloadComponent MetalToolchain
```
