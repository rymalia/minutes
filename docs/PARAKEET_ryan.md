# Parakeet Engine Setup

Minutes supports [parakeet.cpp](https://github.com/Frikallo/parakeet.cpp) as an alternative
transcription engine. Parakeet uses NVIDIA's FastConformer architecture and achieves lower
word error rates than Whisper at equivalent model sizes, with dramatically faster inference
on Apple Silicon via Metal GPU acceleration.

## Why Parakeet?

| Engine | Model | Params | LibriSpeech Clean WER | Speed (10s audio, M-series GPU) |
|--------|-------|--------|----------------------|--------------------------------|
| Whisper | small (default) | 244M | 3.4% | ~200ms |
| Whisper | medium | 769M | 2.9% | ~600ms |
| Whisper | large-v3 | 1.55B | 2.4% | ~1.5s |
| **Parakeet** | **tdt-ctc-110m** | **110M** | **2.4%** | **~27ms** |
| **Parakeet** | **tdt-600m** | **600M** | **1.7%** | **~520ms** |

Parakeet's 110M model matches Whisper large-v3 accuracy at 14x fewer parameters.
The 600M model beats everything in its class.

---  

## Install Process Overview

Parakeet has no installer and no prebuilt binaries yet — you build it from source
once, convert a model once, and point Minutes at the result. There are **three
phases**, done in order:

1. **Build three binaries** — `parakeet` & `example-server` from [parakeet.cpp](https://github.com/Frikallo/parakeet.cpp), and the `minutes` CLI
   compiled with the parakeet feature enabled. *None of these need a model to build.*
2. **Install a model** — download NVIDIA's `.nemo` file, convert it to
   safetensors, and drop the files where Minutes looks for them.
3. **Configure** — set `engine = "parakeet"` and a few keys in `config.toml`.

Two things are worth knowing before you start, because they explain steps that
otherwise look redundant:

- **The `parakeet.cpp` clone is needed in phase 1 and phase 2, then disposable.**
  Phase 1 compiles the binaries from it; phase 2 uses its `scripts/convert_nemo.py`
  to convert the model. After phase 2 you can delete the clone entirely — nothing
  at runtime depends on it.
- **The Silero VAD weights Minutes installs are Parakeet-specific.** Minutes ships
  a known-good `silero_vad_v5.safetensors` *inside the CLI binary*; `minutes setup
  --parakeet` extracts it to disk so the `parakeet` binary can load it. This is a
  different file from Whisper's VAD model — see
  [The two Silero VAD files](#the-two-silero-vad-files) for more detail.

---

## Prerequisites

### macOS (Apple Silicon)

1. **Full Xcode** -- 
Required for Metal GPU acceleration (the shader compiler is not included in Command Line Tools).

```bash
# Install Xcode from the App Store (if not already installed)
#   Or: mas install 497799835

# Accept the license
sudo xcodebuild -license accept

# Switch developer directory to Xcode
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer

# Download the Metal Toolchain
xcodebuild -downloadComponent MetalToolchain
```

2. **CMake** --
Required to build the parakeet binary (can be either 3.x or 4.x using the 
install-disable flags specified below).

3. **Rust** for building the Minutes CLI with parakeet enabled. 

4. **Python 3** for the one-time model conversion, running scripts from the 
parakeet.cpp clone.



### Windows & Linux Support

See [Other Operating Systems](#other-operating-systems) below.

---  

## Build parakeet.cpp

### Clone `parakeet.cpp` with submodules outside the Minutes repo:

```bash
mkdir -p ~/src && cd ~/src
git clone --recursive https://github.com/Frikallo/parakeet.cpp
cd parakeet.cpp
```


### Configure + build with CMake (macOS with Metal):

```bash
# Configure directly with cmake (not `make build`) so these flags take effect:
#   -DPARAKEET_BUILD_SERVER_EXAMPLE=ON           builds example-server 
#                                                (the warm sidecar, off by default)
#   -DAXIOM_INSTALL=OFF -DPARAKEET_INSTALL=OFF   skips the install(EXPORT) rules
#                                                that modern CMake rejects
cmake -B build -DCMAKE_BUILD_TYPE=Release \
  -DPARAKEET_BUILD_SERVER_EXAMPLE=ON \
  -DAXIOM_INSTALL=OFF -DPARAKEET_INSTALL=OFF

cmake --build build -j

# Install the binaries. Their location differs by generator (Ninja vs Unix
# Makefiles), so locate them rather than hard-coding build/bin paths.
# example-server is the warm sidecar required for fast live mode (one loaded
# model reused across utterances instead of a fresh subprocess each time).
mkdir -p ~/.local/bin
find build -type f -perm -u+x \( -name parakeet -o -name example-server \) \
  -exec cp {} ~/.local/bin/ \;
```

If cmake fails with `Neither lock free instructions nor -latomic found`, see 
['Atomics error' in  Troubleshooting](#atomics-error-neither-lock-free-instructions-nor--latomic-found-build) 

---  

## Build Minutes with Parakeet Feature

The `parakeet` Cargo feature must be enabled at build time:

```bash
# CLI only
cd <path/to/your/minutes/checkout>     # e.g. ~/Sites/minutes
cargo build --release -p minutes-cli --features parakeet
mkdir -p ~/.local/bin
cp target/release/minutes ~/.local/bin/minutes
# Make sure ~/.local/bin is on PATH (add to ~/.zshrc if it isn't):
#   export PATH="$HOME/.local/bin:$PATH"

# Tauri desktop app
TAURI_FEATURES="parakeet" cargo tauri build --bundles app

# Or use the build script (add parakeet feature)
cargo build --release -p minutes-cli --features parakeet
```

For local macOS builds in this repo, prefer the helper scripts because they keep the CLI and desktop app aligned on the same feature set:

```bash
MINUTES_BUILD_FEATURES=parakeet,metal ./scripts/build.sh
MINUTES_BUILD_FEATURES=parakeet,metal ./scripts/install-dev-app.sh
```

Note: The `parakeet` feature is opt-in and not included in the default build.
Whisper is always compiled in (it's the default feature). Both engines can coexist
in the same binary — the config file selects the offline/batch path plus both
live transcription paths (`minutes record` sidecar and standalone `minutes live`).
Dictation still uses Whisper. See [Scope](#scope).

---  

## Install Models

Pick one model before you start. The commands below use environment variables so
the same install flow works for either model.

### Highest Accuracy, Multilingual (Recommended)

Use this for the validated multilingual path:

```bash
export MINUTES_PARAKEET_MODEL="tdt-600m"
export HF_REPO="nvidia/parakeet-tdt-0.6b-v3"
export NEMO_FILE="parakeet-tdt-0.6b-v3.nemo"
export CONVERT_MODEL="600m-tdt"
export VOCAB_FILE="tdt-600m.tokenizer.vocab"
```

### Smaller and Faster, English-Only

Use this for the compact English-only model:

```bash
export MINUTES_PARAKEET_MODEL="tdt-ctc-110m"
export HF_REPO="nvidia/parakeet-tdt_ctc-110m"
export NEMO_FILE="parakeet-tdt_ctc-110m.nemo"
export CONVERT_MODEL="110m-tdt-ctc"
export VOCAB_FILE="tdt-ctc-110m.tokenizer.vocab"
```

Parakeet models are distributed as `.nemo` files on HuggingFace and must be
converted to safetensors format.

```bash
# Install Python dependencies
pip install numpy safetensors torch torchaudio huggingface_hub packaging

# Step 1 — install native Silero VAD weights & prepare a dir for the model
minutes setup --parakeet

# Step 2 — download and convert the model (required; setup does not do this).
# Run from inside your parakeet.cpp clone — it has scripts/convert_nemo.py, and
# keeping the .nemo here means every path below resolves in one directory.
cd ~/src/parakeet.cpp
hf download nvidia/parakeet-tdt-0.6b-v3 parakeet-tdt-0.6b-v3.nemo --local-dir .
mkdir -p ~/.minutes/models/parakeet/tdt-600m
python scripts/convert_nemo.py parakeet-tdt-0.6b-v3.nemo -o ~/.minutes/models/parakeet/tdt-600m/tdt-600m.safetensors --model 600m-tdt

# Step 3 - Extract the SentencePiece tokenizer vocab.
# macOS BSD tar has no --wildcards, so this sequence captures the tokenizer 
# file's exact name, then extracts it by that name:
vocab=$(tar tf parakeet-tdt-0.6b-v3.nemo | grep -m1 tokenizer.vocab)
tar xf parakeet-tdt-0.6b-v3.nemo "$vocab"
cp -f "$vocab" ~/.minutes/models/parakeet/tdt-600m/tdt-600m.tokenizer.vocab
# GNU tar (Linux) can do this in one line instead:
#   tar xf parakeet-tdt-0.6b-v3.nemo --wildcards --no-anchored '*tokenizer.vocab'

# Reclaim disk — the .nemo (~2.4 GB) is no longer needed once converted:
rm -f parakeet-tdt-0.6b-v3.nemo
deactivate   # done with the venv; ~/parakeet-convert-env can be deleted
```

`parakeet.cpp` expects the SentencePiece `tokenizer.vocab` file, not the
plain extracted `vocab.txt`. If you install more than one Parakeet model,
store each model in its own directory and use model-specific filenames such
as `tdt-ctc-110m/tdt-ctc-110m.tokenizer.vocab` and
`tdt-600m/tdt-600m.tokenizer.vocab` so model switches stay deterministic.

**Want the compact English-only model instead?**  (`tdt-ctc-110m`)  
Use these steps (same as above but with model name swapped).

```bash
# Model Install for English-only version (tdt-ctc-110m):

# Install Python dependencies in a throwaway venv so pip and python share one
# interpreter and the `hf` downloader lands on PATH (delete the env when done).
python3 -m venv ~/parakeet-convert-env
source ~/parakeet-convert-env/bin/activate
python -m pip install numpy safetensors torch torchaudio huggingface_hub packaging

# Step 1 — install native Silero VAD weights & prepare dir for tdt-ctc-110m model 
minutes setup --parakeet --parakeet-model tdt-ctc-110m

# Step 2 — download and convert the model
cd ~/src/parakeet.cpp
hf download nvidia/parakeet-tdt_ctc-110m parakeet-tdt_ctc-110m.nemo --local-dir .
mkdir -p ~/.minutes/models/parakeet/tdt-ctc-110m
python scripts/convert_nemo.py parakeet-tdt_ctc-110m.nemo -o ~/.minutes/models/parakeet/tdt-ctc-110m/tdt-ctc-110m.safetensors --model 110m-tdt-ctc

# Step 3 - Extract the SentencePiece tokenizer vocab.
vocab=$(tar tf parakeet-tdt_ctc-110m.nemo | grep -m1 tokenizer.vocab)
tar xf parakeet-tdt_ctc-110m.nemo "$vocab"
cp -f "$vocab" ~/.minutes/models/parakeet/tdt-ctc-110m/tdt-ctc-110m.tokenizer.vocab
# GNU tar (Linux):
#   tar xf parakeet-tdt_ctc-110m.nemo --wildcards --no-anchored '*tokenizer.vocab'

# Clean up .nemo file
rm -f parakeet-tdt_ctc-110m.nemo
deactivate   # done with the venv; ~/parakeet-convert-env can be deleted
```

---  

## Configure Minutes

### Config file

Edit `~/.config/minutes/config.toml`:

```toml
[transcription]
engine = "parakeet"              # "whisper" (default) or "parakeet"
parakeet_model = "tdt-600m"      # "tdt-ctc-110m" (English) or "tdt-600m" (multilingual v3)
parakeet_binary = "/Users/you/.local/bin/parakeet"  # Prefer an absolute path for desktop app launches
parakeet_sidecar_enabled = true  # Reuse warm example-server socket for live mode (requires example-server copied above)
parakeet_boost_limit = 25        # Experimental: top graph-derived boost phrases (0 disables)
parakeet_boost_score = 2.0       # Experimental tuning for parakeet.cpp --boost-score
parakeet_fp16 = true             # Default on macOS Apple Silicon: ~35% faster transcription with lower GPU memory (see docs/designs/parakeet-perf-2026-04-14.md)
parakeet_vocab = "tdt-600m.tokenizer.vocab"  # Safer when multiple Parakeet models are installed
```

### Tauri Desktop App

Settings > Transcription > Engine dropdown. Select "Parakeet", then choose the
model. On macOS, Finder-launched apps may not inherit your shell `PATH`, so
desktop users should usually configure `parakeet_binary` as an absolute path.

---  

## Important macOS note for desktop users

If you launch Minutes from Finder, Spotlight, or the Dock, the app may not see
the same `PATH` as your shell.

That means this can work in Terminal:

```bash
which parakeet
```

but the desktop app can still fail with "parakeet binary not found."

For the desktop app, prefer an **absolute path** in `config.toml`:

```toml
[transcription]
parakeet_binary = "/Users/you/.local/bin/parakeet"
```

Common macOS install locations:
- `/opt/homebrew/bin/parakeet`
- `/usr/local/bin/parakeet`
- `/Users/you/.local/bin/parakeet`

---  

## Language Support

| Model | Languages |
|-------|-----------|
| tdt-ctc-110m | English only |
| tdt-600m (v3) | 25 European languages: Bulgarian, Croatian, Czech, Danish, Dutch, English, Estonian, Finnish, French, German, Greek, Hungarian, Italian, Latvian, Lithuanian, Maltese, Polish, Portuguese, Romanian, Russian, Slovak, Slovenian, Spanish, Swedish, Ukrainian |

For languages outside this list, use Whisper (99 languages supported).

---  

## Switching Back to Whisper

Change `engine = "whisper"` in config.toml, or use the Tauri settings UI.
No rebuild needed — both engines are compiled in when the `parakeet` feature is enabled.

---  

## Scope of Parakeet Integration in Minutes

Today, `engine = "parakeet"` is wired for these paths:

- post-recording batch transcription (`minutes process`, desktop processing, and the shared cleanup pipeline)
- folder watcher memo processing after a file lands on disk
- recording-sidecar live transcription during `minutes record`
- standalone live transcription (`minutes live` and desktop Live Mode) — see RFC 0002

Both live paths route each VAD-gated utterance through the Parakeet path. If
`parakeet_sidecar_enabled = true`, they reuse the warm `example-server` socket;
otherwise they fall back to the Parakeet subprocess path for each utterance.
The standalone live path additionally warms the sidecar at session start so the
first utterance does not pay the subprocess-spawn + model-load cost.

Parakeet also participates in the experimental Apple Speech standalone-live
path as the **first runtime fallback**. If `engine = "apple-speech"` is set for
`minutes live` and Apple Speech cannot run or fails mid-session, Minutes tries
a ready Parakeet backend before falling back to Whisper. Apple Speech itself is
still configured separately and remains standalone-live-only; this note is just
about the fallback order behind that path. See [`docs/APPLE_SPEECH.md`](APPLE_SPEECH.md)
for the current Apple Speech scope and desktop-settings limitation.

Strongly recommended for live use: set `parakeet_sidecar_enabled = true` and
ensure `example-server` is discoverable (either on `PATH` or via
`MINUTES_PARAKEET_SERVER_BINARY`). Without the warm sidecar, every live
utterance incurs full subprocess startup, which makes live mode visibly slow.

Dictation remains Whisper by default because its overlay depends on fast
mid-utterance partials. You can opt into Parakeet for final utterance
transcription with:

```toml
[dictation]
backend = "parakeet"
```

In that mode, Whisper still powers progressive partial text while Parakeet is
used at VAD-finalization when the installed/compiled backend is ready. If
Parakeet is unavailable or fails for an utterance, dictation falls back to
Whisper for that utterance.

If Parakeet support is not compiled into the current build, Minutes logs a
warning and falls back to Whisper for live and dictation paths.

Note: both live paths still require the `whisper` Cargo feature to be compiled
in. Whisper is the runtime fallback when Parakeet fails mid-session (warmup
error, sidecar unreachable, transcription failure), so builds with
`--features parakeet` and `--no-default-features` (no whisper) cannot run
`minutes live` — the session errors out immediately. Whisper is a default
feature, so this only matters for unusual build configurations.

---  

## Other Operating Systems

### Linux / Windows (parakeet.cpp, CPU only)

parakeet.cpp does not yet have CUDA support (WIP in the axiom tensor library).
CPU-only builds work but lose the speed advantage. Monitor the
[parakeet.cpp repo](https://github.com/Frikallo/parakeet.cpp) for CUDA updates.

### Linux with an NVIDIA GPU (NeMo wrapper, CUDA)

If you have an NVIDIA GPU on Linux, NVIDIA's [NeMo toolkit](https://github.com/NVIDIA/NeMo)
supports Parakeet natively with full CUDA acceleration. The `parakeet_binary`
config key accepts any executable that follows the parakeet.cpp CLI contract,
so you can point it at a small Python wrapper around NeMo and get GPU-backed
transcription without waiting on parakeet.cpp CUDA support.

This approach was contributed by [@ed0c](https://github.com/silverstein/minutes/issues/122).
Tested on an RTX 3090 with CUDA 13.2: a 68-minute French meeting transcribes
in about 3.5 minutes total, with quality that beats Whisper large-v3 on
mixed-language audio.

**1. Create a Python venv with NeMo**

```bash
python3 -m venv ~/parakeet-env
source ~/parakeet-env/bin/activate
pip install nemo_toolkit[asr]
```

**2. Create the wrapper script**

Save this as `~/bin/parakeet-nemo` (or any path you control) and `chmod +x` it:

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

**3. Point Minutes at it**

In `~/.config/minutes/config.toml`:

```toml
[transcription]
engine = "parakeet"
parakeet_binary = "/home/you/bin/parakeet-nemo"
parakeet_model = "tdt-600m"
parakeet_vocab = "tdt-600m.tokenizer.vocab"
```

**Known limitation: per-chunk model reload**

Minutes invokes the parakeet binary once per audio chunk, so the NeMo
wrapper reloads the model from disk cache on every call (about 4 to 5
seconds of overhead per chunk). For long recordings this adds up. A
persistent daemon that keeps the model resident in VRAM eliminates the
reload cost; see [#122](https://github.com/silverstein/minutes/issues/122)
if you want to help land one.

---  

## Troubleshooting

### "parakeet binary not found"
The `parakeet` executable is not in your PATH. Either:
- Add its location to PATH: `export PATH="$PATH:/path/to/parakeet.cpp/build/bin"`
- Or set the full path in config: `parakeet_binary = "/path/to/parakeet"`

On macOS desktop builds, the second option is more reliable because Finder /
Spotlight / Dock launches may not inherit the same shell `PATH` that Terminal
sees.

### "unknown parakeet model"
Only `tdt-600m` and `tdt-ctc-110m` are supported. Check your config.

### "Expected parakeet model in ~/.minutes/models/parakeet/"
`minutes setup --parakeet` installs the native VAD weights and prints the
model-conversion recipe — it does **not** download the model itself. Follow the
manual download + convert steps in [Install Models](#install-models) to create
the model files this error is asking for.

### Atomics error: "Neither lock free instructions nor -latomic found" (build)

 If CMake fails earlier with "Neither lock free instructions nor -latomic
 found", either patch `FindAtomics.cmake` to short-circuit on Apple arm64, 
 or use CMake 3.31.x

> Environment-sensitive, not universal to CMake 4.x. Highway's vendored
`FindAtomics.cmake` runs a try-compile probe (it pins `CMAKE_CXX_STANDARD 11`,
citing CMake issue 24063); on some macOS toolchains the probe fails, and because
macOS ships no `libatomic` it hits `FATAL_ERROR "Neither lock free instructions
nor -latomic found."` We *no longer* reproduce this on CMake 4.3.2 or 4.3.3 (the
probe passed on both), so build normally first. If you do hit it, either:

**Option A — use CMake 3.31.x** (the known-good version; install steps in
[CMake version 3.x install](#cmake-version-3x-install)).

**Option B — patch the probe.** Edit
`third_party/axiom/third_party/highway/cmake/FindAtomics.cmake` and replace the
`check_cxx_source_compiles(...)` call (line 34) with a short-circuit on Apple
Silicon, where atomics are always lock-free:

```cmake
if(APPLE AND CMAKE_SYSTEM_PROCESSOR MATCHES "arm64")
  set(ATOMICS_LOCK_FREE_INSTRUCTIONS TRUE)  # Apple Silicon: lock-free atomics
else()
  check_cxx_source_compiles("${atomic_code}" ATOMICS_LOCK_FREE_INSTRUCTIONS)
endif()
```

### axiom export-set error: "requires target hwy that is not in any export set" (build)

On any modern CMake you may also see:

```
CMake Error in third_party/axiom/CMakeLists.txt:
  install(EXPORT "AxiomTargets" ...) includes target "axiom" which requires
  target "hwy" that is not in any export set.
```

Modern CMake tightened `install(EXPORT)` rules; parakeet.cpp's `axiom` submodule
exports `axiom` but not its `hwy` dependency, which the new rule rejects. You
copy the binaries by hand anyway, so just skip the install rules at configure
time using parakeet.cpp's own options:

```bash
cd ~/src/parakeet.cpp
rm -rf build
cmake -B build -DCMAKE_BUILD_TYPE=Release \
  -DPARAKEET_BUILD_SERVER_EXAMPLE=ON \
  -DAXIOM_INSTALL=OFF -DPARAKEET_INSTALL=OFF
cmake --build build -j
```

`PARAKEET_INSTALL` is defined in the root `CMakeLists.txt` and `AXIOM_INSTALL`
in `third_party/axiom/CMakeLists.txt`, so this works on any CMake version — no
downgrade needed.

### CMake version 3.x install

Follow these steps to install known-good CMake 3.x. Homebrew no longer ships 
`cmake@3`, so grab the official Kitware universal tarball:

```bash
#    3.31.x is the version that sidesteps rare Highway atomics 
#    probe failure if you happen to hit it.
curl -L -o /tmp/cmake-3.31.12.tar.gz \
  https://github.com/Kitware/CMake/releases/download/v3.31.12/cmake-3.31.12-macos-universal.tar.gz

tar xf /tmp/cmake-3.31.12.tar.gz -C /tmp

# Put this temp CMake first on PATH for this session:
export PATH="/tmp/cmake-3.31.12-macos-universal/CMake.app/Contents/bin:$PATH"
```

> Any recent CMake works — step 1's `-DAXIOM_INSTALL=OFF
  -DPARAKEET_INSTALL=OFF` flags handle the one common gotcha (axiom's
  `install(EXPORT)` strictness rejecting `target "axiom" ... requires target
  "hwy" that is not in any export set`), with no downgrade needed. We verified
  the build on CMake 3.31.x, 4.3.2, and 4.3.3. CMake 3.31.x stays the known-good
  fallback for the rare atomics probe failure; if you hit `Neither lock free
  instructions nor -latomic found`, see 
  ['Atomics error' in  Troubleshooting](#atomics-error-neither-lock-free-instructions-nor--latomic-found-build).

### Metal shader compiler not found (build)
Requires full Xcode (not just Command Line Tools):
```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
xcodebuild -downloadComponent MetalToolchain
```
