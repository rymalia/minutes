# Parakeet Engine Setup

Minutes can use [parakeet.cpp](https://github.com/Frikallo/parakeet.cpp) as an
offline transcription engine instead of Whisper. On Apple Silicon, Parakeet can
run through Metal and is much faster than comparable Whisper models.

This guide is for the native `parakeet.cpp` path: Minutes runs an external
`parakeet` binary, points it at converted model files, and passes it a
Parakeet-specific Silero VAD file.

## What You Are Installing

These are the artifacts involved in a working install:

| Piece | Built or written by | Needed at runtime? |
|-------|---------------------|--------------------|
| `parakeet` binary | `Frikallo/parakeet.cpp` CMake build | Yes |
| `example-server` binary | `Frikallo/parakeet.cpp` CMake build | Yes, for fast live mode |
| `minutes` binary with `parakeet` feature | Minutes Rust build or signed release binary | Yes |
| `silero_vad_v5.safetensors` | `minutes setup --parakeet` extracts bundled bytes | Yes |
| converted `.safetensors` model | `parakeet.cpp/scripts/convert_nemo.py` | Yes |
| tokenizer vocab | extracted from the downloaded `.nemo` archive | Yes |

The downloaded `.nemo` file is only a source artifact. The `parakeet.cpp` clone
is only needed while building the two external binaries and while converting
models. After conversion, Minutes does not need the clone or the `.nemo` file.

## Model Choice

Pick one model before running the install commands.

| Model | Best for | Notes |
|-------|----------|-------|
| `tdt-600m` | multilingual transcription | highest quality; larger download and output |
| `tdt-ctc-110m` | English-only transcription | compact and very fast |

For the multilingual model:

```bash
export MINUTES_PARAKEET_MODEL="tdt-600m"
export HF_REPO="nvidia/parakeet-tdt-0.6b-v3"
export NEMO_FILE="parakeet-tdt-0.6b-v3.nemo"
export CONVERT_MODEL="600m-tdt"
export VOCAB_FILE="tdt-600m.tokenizer.vocab"
```

For the English-only model:

```bash
export MINUTES_PARAKEET_MODEL="tdt-ctc-110m"
export HF_REPO="nvidia/parakeet-tdt_ctc-110m"
export NEMO_FILE="parakeet-tdt_ctc-110m.nemo"
export CONVERT_MODEL="110m-tdt-ctc"
export VOCAB_FILE="tdt-ctc-110m.tokenizer.vocab"
```

The underscore in `parakeet-tdt_ctc-110m.nemo` is real. The local Minutes model
directory still uses the hyphenated name: `tdt-ctc-110m`.

## Apple Silicon Fast Path

Prerequisites:

- Full Xcode, not just Command Line Tools. Metal needs the full shader compiler.
- CMake. Recent CMake versions work with the install-disable flags below.
- Rust, if you are building the Minutes CLI yourself.
- Python 3, for the one-time model conversion.

### 1. Build `parakeet` and `example-server`

Clone `parakeet.cpp` outside the Minutes repo:

```bash
mkdir -p ~/src
cd ~/src
git clone --recursive https://github.com/Frikallo/parakeet.cpp
cd parakeet.cpp
```

Configure directly with CMake:

```bash
cmake -B build -DCMAKE_BUILD_TYPE=Release \
  -DPARAKEET_BUILD_SERVER_EXAMPLE=ON \
  -DAXIOM_INSTALL=OFF \
  -DPARAKEET_INSTALL=OFF

cmake --build build -j
```

Why these flags matter:

- `PARAKEET_BUILD_SERVER_EXAMPLE=ON` builds `example-server`, the warm sidecar
  used by live mode.
- `AXIOM_INSTALL=OFF` and `PARAKEET_INSTALL=OFF` skip CMake install/export
  rules that are not needed when Minutes copies binaries by hand.

Copy both binaries to a stable location:

```bash
mkdir -p ~/.local/bin
find build -type f -perm -u+x \( -name parakeet -o -name example-server \) \
  -exec cp -f {} ~/.local/bin/ \;

ls -lh ~/.local/bin/parakeet ~/.local/bin/example-server
```

The `find` command is intentional. CMake generators place the binaries in
different directories: Ninja typically uses `build/bin/`, while Unix Makefiles
can place them under `build/` and `build/examples/server/`.

Optional Apple Silicon linkage check:

```bash
otool -L ~/.local/bin/parakeet | grep -E 'Metal|MPS|MPSGraph|Accelerate'
```

### 2. Install a Minutes binary with Parakeet support

The `parakeet` feature must be compiled into the Minutes binary that will run
transcription.

If you are building the CLI from this repo:

```bash
cd <path/to/minutes>
cargo build --release -p minutes-cli --features parakeet
mkdir -p ~/.local/bin
cp -f target/release/minutes ~/.local/bin/minutes
```

Make sure your shell sees that binary:

```bash
export PATH="$HOME/.local/bin:$PATH"
which minutes
minutes --version
```

If you use the signed desktop app, check that your installed app release already
includes Parakeet. The Homebrew Formula CLI is often whisper-only; it can still
run `minutes setup --parakeet`, but it is not the binary you want doing
Parakeet transcription unless it was built with the feature.

### 3. Write the bundled Parakeet VAD file

Run setup for the model you selected:

```bash
minutes setup --parakeet --parakeet-model "$MINUTES_PARAKEET_MODEL"
```

This command:

- writes `~/.minutes/models/parakeet/silero_vad_v5.safetensors`
- creates `~/.minutes/models/parakeet/$MINUTES_PARAKEET_MODEL/`
- checks whether a `parakeet` binary is discoverable
- prints the manual model-conversion recipe

It does not download the `.nemo` model, run conversion, or extract the tokenizer
vocab.

### 4. Download and convert the model

Use a throwaway Python environment so `python`, `pip`, and the `hf` downloader
all refer to the same interpreter:

```bash
python3 -m venv ~/parakeet-convert-env
source ~/parakeet-convert-env/bin/activate
python -m pip install numpy safetensors torch torchaudio huggingface_hub packaging
```

Run the conversion from the `parakeet.cpp` clone. That repo contains
`scripts/convert_nemo.py`.

```bash
cd ~/src/parakeet.cpp

hf download "$HF_REPO" "$NEMO_FILE" --local-dir .

export MODEL_DIR="$HOME/.minutes/models/parakeet/$MINUTES_PARAKEET_MODEL"
mkdir -p "$MODEL_DIR"

python scripts/convert_nemo.py "$NEMO_FILE" \
  -o "$MODEL_DIR/$MINUTES_PARAKEET_MODEL.safetensors" \
  --model "$CONVERT_MODEL"
```

Extract the SentencePiece tokenizer vocab. macOS ships BSD tar, which does not
support GNU tar's `--wildcards` flag, so list the archive first and extract the
exact filename:

```bash
vocab=$(tar tf "$NEMO_FILE" | grep -m1 tokenizer.vocab)
tar xf "$NEMO_FILE" "$vocab"
cp -f "$vocab" "$MODEL_DIR/$VOCAB_FILE"
```

Clean up the temporary artifacts when conversion is done:

```bash
deactivate
rm -f "$NEMO_FILE"
```

At this point, the runtime files should look like this:

```text
~/.minutes/models/parakeet/
  silero_vad_v5.safetensors
  tdt-600m/
    tdt-600m.safetensors
    tdt-600m.tokenizer.vocab
```

For `tdt-ctc-110m`, the model directory and filenames use `tdt-ctc-110m`
instead.

### 5. Configure Minutes

Edit `~/.config/minutes/config.toml`.

For `tdt-600m`:

```toml
[transcription]
engine = "parakeet"
parakeet_model = "tdt-600m"
parakeet_binary = "/Users/you/.local/bin/parakeet"
parakeet_vocab = "tdt-600m.tokenizer.vocab"
parakeet_sidecar_enabled = true
```

For `tdt-ctc-110m`:

```toml
[transcription]
engine = "parakeet"
parakeet_model = "tdt-ctc-110m"
parakeet_binary = "/Users/you/.local/bin/parakeet"
parakeet_vocab = "tdt-ctc-110m.tokenizer.vocab"
parakeet_sidecar_enabled = true
```

Use an absolute `parakeet_binary` path for the desktop app. Apps launched from
Finder, Spotlight, or the Dock may not inherit your shell `PATH`.

`parakeet_sidecar_enabled = true` tells live transcription to reuse the warm
`example-server` sidecar. Without it, live mode can fall back to spawning
`parakeet` for each utterance, which repeatedly reloads the model and feels
slow.

### 6. Verify

Check files:

```bash
test -x ~/.local/bin/parakeet
test -x ~/.local/bin/example-server
test -f ~/.minutes/models/parakeet/silero_vad_v5.safetensors
test -f "$HOME/.minutes/models/parakeet/$MINUTES_PARAKEET_MODEL/$MINUTES_PARAKEET_MODEL.safetensors"
test -f "$HOME/.minutes/models/parakeet/$MINUTES_PARAKEET_MODEL/$VOCAB_FILE"
```

Check config:

```bash
minutes health
```

Then process a short known audio file or make a short test recording.

## What Can Be Deleted After Install

After the binaries are copied and the selected model is converted, these are no
longer needed by Minutes at runtime:

- the downloaded `.nemo` file
- the throwaway Python environment
- the `~/src/parakeet.cpp` clone

Keep the `parakeet.cpp` clone if you expect to install another model soon or
rebuild the external binaries after upstream changes.

Do not delete:

- `~/.local/bin/parakeet`
- `~/.local/bin/example-server`
- `~/.minutes/models/parakeet/silero_vad_v5.safetensors`
- `~/.minutes/models/parakeet/<model>/<model>.safetensors`
- `~/.minutes/models/parakeet/<model>/<model>.tokenizer.vocab`

## VAD Files

There are multiple Silero VAD artifacts in a complete Minutes install. They are
not interchangeable.

| File | Used by |
|------|---------|
| `~/.minutes/models/parakeet/silero_vad_v5.safetensors` | Parakeet / `parakeet.cpp` native VAD |
| `~/.minutes/models/ggml-silero-v6.2.0.bin` | Whisper path / whisper-rs Silero VAD |
| `~/.minutes/models/silero-vad-v6.2.0.onnx` | Optional streaming VAD engine if built with `vad-ort` |

`minutes setup --parakeet` writes only the Parakeet VAD file. Normal
`minutes setup` downloads the Whisper VAD artifacts.

## Scope in Minutes

When `engine = "parakeet"` is configured and the binary was built with Parakeet
support, Minutes can use Parakeet for:

- post-recording batch transcription
- desktop processing
- folder watcher processing
- recording-sidecar live transcription during `minutes record`
- standalone live transcription through `minutes live` and desktop Live Mode
- final utterance transcription in dictation when `[dictation] backend = "parakeet"`

Dictation still uses Whisper for progressive partial text. If Parakeet is not
available for a final utterance, dictation falls back to Whisper for that
utterance.

Whisper remains the fallback for live paths when Parakeet fails mid-session, so
unusual builds that enable Parakeet while disabling the default `whisper`
feature cannot run `minutes live`.

## Linux With NVIDIA GPU

The native `parakeet.cpp` path does not currently provide CUDA acceleration.
CPU-only builds work, but lose the main speed advantage.

On Linux with NVIDIA GPUs, NVIDIA's NeMo toolkit can run Parakeet with CUDA. The
`parakeet_binary` config key accepts any executable that follows the
`parakeet.cpp` CLI contract, so you can point Minutes at a wrapper script around
NeMo.

Example wrapper:

```bash
#!/bin/bash
source ~/parakeet-env/bin/activate

python3 - "$@" << 'PY'
import contextlib
import os
import sys

os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"

audio_files = [arg for arg in sys.argv[1:] if arg.endswith(".wav")]
if not audio_files:
    sys.exit(0)

with contextlib.redirect_stdout(sys.stderr):
    import nemo.collections.asr as nemo_asr
    model = nemo_asr.models.ASRModel.from_pretrained("nvidia/parakeet-tdt-0.6b-v3")
    model = model.cuda()

output = model.transcribe(audio_files, timestamps=True)
for result in output:
    segments = result.timestamp.get("segment", [])
    if segments:
        for segment in segments:
            text = segment["segment"].strip()
            if text:
                print(f"[{segment['start']:.2f} - {segment['end']:.2f}] {text}", flush=True)
    elif result.text.strip():
        print(f"[0.00 - 1.00] {result.text.strip()}", flush=True)
PY
```

Known limitation: this wrapper reloads the NeMo model for each chunk. A
persistent daemon that keeps the model resident in VRAM avoids that overhead.

## Troubleshooting

### `parakeet binary not found`

The desktop app probably cannot see your shell `PATH`. Set an absolute path:

```toml
[transcription]
parakeet_binary = "/Users/you/.local/bin/parakeet"
```

### `Expected parakeet model in ~/.minutes/models/parakeet/`

`minutes setup --parakeet` wrote the Parakeet VAD file and created the model
directory, but the converted model files are missing. Complete the download,
conversion, and tokenizer extraction steps.

### `unknown parakeet model`

Only these model keys are currently supported:

- `tdt-600m`
- `tdt-ctc-110m`

### CMake export-set error involving `AxiomTargets` and `hwy`

If CMake reports that target `axiom` requires target `hwy` that is not in an
export set, reconfigure with the install rules disabled:

```bash
cmake -B build -DCMAKE_BUILD_TYPE=Release \
  -DPARAKEET_BUILD_SERVER_EXAMPLE=ON \
  -DAXIOM_INSTALL=OFF \
  -DPARAKEET_INSTALL=OFF
```

The Minutes install flow copies binaries manually and does not need
`cmake --install`.

### Atomics error: `Neither lock free instructions nor -latomic found`

This is an environment-sensitive Highway probe failure on some macOS toolchains.
Build normally first. If you hit the error, use CMake 3.31.x for the
`parakeet.cpp` build shell:

```bash
curl -L -o /tmp/cmake-3.31.12.tar.gz \
  https://github.com/Kitware/CMake/releases/download/v3.31.12/cmake-3.31.12-macos-universal.tar.gz
tar xf /tmp/cmake-3.31.12.tar.gz -C /tmp
export PATH="/tmp/cmake-3.31.12-macos-universal/CMake.app/Contents/bin:$PATH"
cmake --version
```

Then remove and recreate the `build` directory.

### Metal shader compiler not found

Install full Xcode, accept the license, select it, and download the Metal
toolchain:

```bash
sudo xcodebuild -license accept
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
xcodebuild -downloadComponent MetalToolchain
```
