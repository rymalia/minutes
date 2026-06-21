# Parakeet Engine Setup

Minutes can transcribe with [parakeet.cpp](https://github.com/Frikallo/parakeet.cpp)
instead of Whisper. Parakeet uses NVIDIA's FastConformer architecture: lower word
error rates than Whisper at equivalent model sizes, and dramatically faster
inference on Apple Silicon via Metal.

This guide is written for **macOS on Apple Silicon**, which is the primary and
best-supported path. Linux and Windows are covered briefly under
[Other platforms](#other-platforms).

## Why Parakeet?

| Engine | Model | Params | LibriSpeech Clean WER | Speed (10s audio, M-series GPU) |
|--------|-------|--------|----------------------|--------------------------------|
| Whisper | small (default) | 244M | 3.4% | ~200ms |
| Whisper | medium | 769M | 2.9% | ~600ms |
| Whisper | large-v3 | 1.55B | 2.4% | ~1.5s |
| **Parakeet** | **tdt-ctc-110m** | **110M** | **2.4%** | **~27ms** |
| **Parakeet** | **tdt-600m** | **600M** | **1.7%** | **~520ms** |

Parakeet's 110M model matches Whisper large-v3 accuracy at 14× fewer parameters.
The 600M model beats everything in its class and adds 25-language support.

---

## How the install works

Parakeet has no installer and no prebuilt binaries yet — you build it from source
once, convert a model once, and point Minutes at the result. There are **three
phases**, done in order:

1. **Build three binaries** — `parakeet`, `example-server`, and a `minutes` CLI
   compiled with the `parakeet` feature. *None of these need a model to build.*
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
  [The two Silero VAD files](#the-two-silero-vad-files) if that surprises you.

---

## Prerequisites

**Full Xcode** (not just Command Line Tools — Metal needs Xcode's shader compiler):

```bash
# Install Xcode from the App Store, or: mas install 497799835
sudo xcodebuild -license accept
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
xcodebuild -downloadComponent MetalToolchain
```

**CMake** — any recent version. The build flags in phase 1 handle the one common
gotcha (axiom's `install(EXPORT)` strictness) on every CMake version we tested
(3.31.x, 4.3.2, 4.3.3), so no downgrade is needed. The only reason to pin an older
CMake is the rare atomics-probe failure described in
[Troubleshooting](#troubleshooting).

---

## Phase 1 — Build the three binaries

None of these steps need a model. You're just producing executables.

```bash
# Clone parakeet.cpp OUTSIDE the Minutes repo. ~/src is used throughout this guide.
mkdir -p ~/src && cd ~/src
git clone --recursive https://github.com/Frikallo/parakeet.cpp
cd parakeet.cpp

# Configure with cmake directly (not `make build`) so these flags take effect:
#   -DPARAKEET_BUILD_SERVER_EXAMPLE=ON  builds example-server (off by default)
#   -DAXIOM_INSTALL=OFF -DPARAKEET_INSTALL=OFF  skips the install(EXPORT) rules
#                                               that modern CMake rejects
cmake -B build -DCMAKE_BUILD_TYPE=Release \
  -DPARAKEET_BUILD_SERVER_EXAMPLE=ON \
  -DAXIOM_INSTALL=OFF -DPARAKEET_INSTALL=OFF
cmake --build build -j

# Copy both binaries to ~/.local/bin. Their location inside build/ depends on the
# generator CMake chose (Ninja vs Unix Makefiles), so locate them rather than
# hard-coding a path.
mkdir -p ~/.local/bin
find build -type f -perm -u+x \( -name parakeet -o -name example-server \) \
  -exec cp {} ~/.local/bin/ \;
```

**Why `example-server`?** It's the warm sidecar. Live mode (`minutes record`'s
sidecar and `minutes live`) reuses one loaded model across utterances through it.
Without it, live mode spawns a fresh `parakeet` subprocess per utterance and
reloads the model each time — visibly slow. Batch transcription doesn't need it.

Now build the Minutes CLI **with the `parakeet` feature** and install it:

```bash
cd ~/src/minutes          # your Minutes checkout
export CXXFLAGS="-I$(xcrun --show-sdk-path)/usr/include/c++/v1"   # macOS C++ headers
cargo build --release -p minutes-cli --features parakeet
cp target/release/minutes ~/.local/bin/minutes
```

Make sure `~/.local/bin` is on your `PATH` (add to `~/.zshrc` if not):

```bash
export PATH="$HOME/.local/bin:$PATH"
```

> **Already using the desktop app or Homebrew CLI?** Tagged release artifacts (the
> DMG and the per-platform CLI binaries) already ship with the `parakeet` feature,
> so you can skip the `cargo build` above and use the `minutes` you already have.
> The one exception is the **Homebrew formula CLI** (`brew install
> silverstein/tap/minutes`), which is Whisper-only; it can still *run* `minutes
> setup --parakeet` but prints a feature-flag warning, and won't transcribe with
> Parakeet itself.

---

## Phase 2 — Install a model

First, let Minutes create the model directory and extract its bundled Parakeet VAD
weights:

```bash
minutes setup --parakeet                          # for tdt-600m (default)
# minutes setup --parakeet --parakeet-model tdt-ctc-110m   # for the 110m model
```

This **does not download the model** — it only creates
`~/.minutes/models/parakeet/<model>/` and installs the VAD weights. The download +
conversion below is the part that actually fetches the model.

### Pick your model

Set these four variables for the model you want. Everything after this block is
identical for both models.

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

### Download, convert, place

The conversion script (`scripts/convert_nemo.py`) lives in the `parakeet.cpp`
clone, so run this from inside it. Use a **throwaway Python venv** so `pip` and
`python` share one interpreter and the `hf` downloader lands on `PATH`.

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

# Extract the SentencePiece tokenizer.vocab. macOS BSD tar has no --wildcards,
# so capture the exact filename first, then extract by it.
vocab=$(tar tf "$NEMO" | grep -m1 tokenizer.vocab)
tar xf "$NEMO" "$vocab"
cp -f "$vocab" "$DEST/$MODEL.tokenizer.vocab"
# (GNU tar on Linux can do this in one line:
#   tar xf "$NEMO" --wildcards --no-anchored '*tokenizer.vocab')

deactivate
rm -f "$NEMO"             # the .nemo is no longer needed once converted
```

That leaves you with exactly two files Minutes needs, e.g.:

```
~/.minutes/models/parakeet/tdt-600m/tdt-600m.safetensors
~/.minutes/models/parakeet/tdt-600m/tdt-600m.tokenizer.vocab
```

**Cleanup.** Phase 2 is the last thing that needs the clone or the venv. Unless
you plan to install another model or rebuild parakeet.cpp, you can remove both:

```bash
rm -rf ~/src/parakeet.cpp ~/parakeet-convert-env
```

---

## Phase 3 — Configure

Edit `~/.config/minutes/config.toml`. This is a file edit — don't paste TOML into
a shell.

```toml
[transcription]
engine = "parakeet"
parakeet_model = "tdt-600m"                           # or "tdt-ctc-110m"
parakeet_vocab = "tdt-600m.tokenizer.vocab"           # match the model
parakeet_binary = "/Users/you/.local/bin/parakeet"    # absolute path — see note below
parakeet_sidecar_enabled = true                       # reuse example-server for live mode
```

**Use an absolute `parakeet_binary` path.** A Finder/Spotlight/Dock-launched
desktop app does not inherit your shell `PATH`, so a bare `parakeet` that works in
Terminal can still fail with "parakeet binary not found" in the app. An absolute
path avoids the whole class of problem. Common locations:
`/Users/you/.local/bin/parakeet`, `/opt/homebrew/bin/parakeet`,
`/usr/local/bin/parakeet`.

Optional tuning keys are listed under [Config reference](#config-reference).

### Verify

```bash
minutes transcribe path/to/some.wav     # should run on Parakeet now
```

If it falls back to Whisper or errors, check [Troubleshooting](#troubleshooting).

### Desktop app

Settings → Transcription → Engine → "Parakeet", then choose the model. Still set
`parakeet_binary` to an absolute path for the PATH reason above.

---

## Switching back to Whisper

Set `engine = "whisper"` in `config.toml` (or use the desktop Settings UI). No
rebuild — both engines are compiled in whenever the `parakeet` feature is enabled.

---

## Reference

### Config reference

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

`parakeet_fp16` already defaults to `true`, so listing it is documentation of the
default rather than a behavior change.

[dictation] uses Whisper by default because its overlay needs fast mid-utterance
partials. You can opt into Parakeet for the final utterance only:

```toml
[dictation]
backend = "parakeet"
```

Whisper still drives progressive partials; Parakeet transcribes at
VAD-finalization, falling back to Whisper if it's unavailable for an utterance.

### Where things live

```
~/.local/bin/parakeet                  # transcription binary (built in phase 1)
~/.local/bin/example-server            # warm sidecar for live mode (phase 1)
~/.minutes/models/parakeet/silero_vad_v5.safetensors    # Parakeet VAD (from setup)
~/.minutes/models/parakeet/<model>/<model>.safetensors  # model weights (phase 2)
~/.minutes/models/parakeet/<model>/<model>.tokenizer.vocab
```

### The two Silero VAD files

Both engines do voice-activity detection with Silero, but they load **different
artifacts**, which is why a Parakeet install touches a VAD file even though you
already set up Whisper:

| File | Used by |
|------|---------|
| `~/.minutes/models/parakeet/silero_vad_v5.safetensors` | Parakeet (`parakeet.cpp` native VAD) |
| `~/.minutes/models/ggml-silero-v6.2.0.bin` | Whisper path (whisper-rs Silero VAD) |
| `~/.minutes/models/silero-vad-v6.2.0.onnx` | Optional streaming VAD, if built with `vad-ort` |

The Parakeet blob is bundled inside the `minutes` binary and extracted by `minutes
setup --parakeet`. The Whisper ones are downloaded by ordinary `minutes setup`.

### Language support

| Model | Languages |
|-------|-----------|
| tdt-ctc-110m | English only |
| tdt-600m (v3) | 25 European languages: Bulgarian, Croatian, Czech, Danish, Dutch, English, Estonian, Finnish, French, German, Greek, Hungarian, Italian, Latvian, Lithuanian, Maltese, Polish, Portuguese, Romanian, Russian, Slovak, Slovenian, Spanish, Swedish, Ukrainian |

For languages outside this list, use Whisper (99 languages).

### What Parakeet is wired for (scope)

`engine = "parakeet"` applies to:

- post-recording batch transcription (`minutes process`, desktop processing, the shared cleanup pipeline)
- folder-watcher memo processing
- the `minutes record` live sidecar
- standalone live transcription (`minutes live`, desktop Live Mode)

Both live paths route each VAD-gated utterance through Parakeet, reusing the warm
`example-server` socket when `parakeet_sidecar_enabled = true` (otherwise spawning
a subprocess per utterance). Parakeet is also the first runtime fallback for the
experimental Apple Speech live path (see [`docs/APPLE_SPEECH.md`](APPLE_SPEECH.md)).

Both live paths still require the `whisper` feature compiled in — Whisper is the
runtime fallback if Parakeet fails mid-session. A `--features parakeet
--no-default-features` build (no whisper) therefore can't run `minutes live`.
Since whisper is a default feature, this only affects unusual build configs.

### Building the desktop app with Parakeet

```bash
TAURI_FEATURES="parakeet" cargo tauri build --bundles app
# or, to keep CLI + app on the same feature set:
MINUTES_BUILD_FEATURES=parakeet,metal ./scripts/build.sh
MINUTES_BUILD_FEATURES=parakeet,metal ./scripts/install-dev-app.sh
```

The `parakeet` feature is opt-in and not in the default build. Whisper is always
compiled in.

### Other platforms

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
`parakeet` isn't on the app's `PATH`. Set an absolute `parakeet_binary` in
`config.toml` (most reliable for desktop launches), or add its directory to `PATH`.

### "unknown parakeet model"
Only `tdt-ctc-110m` and `tdt-600m` are valid. Check `parakeet_model`.

### "Expected parakeet model in ~/.minutes/models/parakeet/"
`minutes setup --parakeet` installs VAD weights and creates the directory but does
**not** download the model. Run [Phase 2](#phase-2--install-a-model) to create the
files this error is asking for.

### Parakeet "works" but transcription still uses Whisper
Your `minutes` binary was likely built without `--features parakeet` (every
`parakeet_*` config key is silently inert in that case). Rebuild per
[Phase 1](#phase-1--build-the-three-binaries), or use a tagged release artifact /
the DMG, which ship with the feature. The Homebrew formula CLI is Whisper-only.

### Build: "requires target hwy that is not in any export set"
Modern CMake tightened `install(EXPORT)`; parakeet.cpp's `axiom` submodule exports
`axiom` but not its `hwy` dependency. You copy the binaries by hand anyway, so skip
the install rules — this is exactly what the `-DAXIOM_INSTALL=OFF
-DPARAKEET_INSTALL=OFF` flags in phase 1 do. Works on any CMake version; no
downgrade needed. (Homebrew no longer ships a `cmake@3` formula regardless.)

### Build: "Neither lock free instructions nor -latomic found"
Environment-sensitive, not universal to CMake 4.x — Highway's vendored
`FindAtomics.cmake` try-compile probe fails on some macOS toolchains, and macOS
ships no `libatomic`. We did **not** reproduce it on CMake 4.3.2 or 4.3.3, so build
normally first. If you hit it, either:

- **Use CMake 3.31.x** (known-good). Grab Kitware's tarball and put it first on
  `PATH` for the build shell only:
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

### convert_nemo.py: "No module named 'numpy'"
`numpy` must be in your venv explicitly — safetensors needs it to save, but neither
safetensors nor modern PyTorch installs it transitively. The phase 2 `pip install`
line already includes it; if you assembled your own, add `numpy` (2.x is fine).
