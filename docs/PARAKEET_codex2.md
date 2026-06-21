# Parakeet Engine Setup

Minutes can use [parakeet.cpp](https://github.com/Frikallo/parakeet.cpp) as a
local transcription engine instead of Whisper. On Apple Silicon, this gives
Minutes access to Parakeet models through Metal GPU acceleration.

This guide is for the native `parakeet.cpp` path. Minutes runs an external
`parakeet` binary, points it at converted model files, and passes it a
Parakeet-specific Silero VAD file.

## The Install in One Picture

A working install has three runtime binaries and three runtime model assets:

| Runtime file | Where it comes from | Needed for |
|--------------|---------------------|------------|
| `parakeet` | built from `Frikallo/parakeet.cpp` | all Parakeet transcription |
| `example-server` | built from `Frikallo/parakeet.cpp` | fast live transcription |
| `minutes` with the `parakeet` feature | Minutes release or local Rust build | selecting Parakeet |
| `silero_vad_v5.safetensors` | extracted by `minutes setup --parakeet` | Parakeet VAD |
| `<model>.safetensors` | converted from the downloaded `.nemo` | model weights |
| `<model>.tokenizer.vocab` | extracted from the downloaded `.nemo` | tokenizer vocab |

The downloaded `.nemo` file is not used at runtime. The `parakeet.cpp` clone is
not used at runtime either. You need the clone while building the two
`parakeet.cpp` binaries and while running `scripts/convert_nemo.py`; after that,
Minutes only needs the copied binaries and files under `~/.minutes/models`.

## Choose a Model

Pick one model before you start. The commands below use environment variables so
the same install flow works for either model.

### Multilingual, Highest Quality

Use this for the validated multilingual path:

```bash
export MINUTES_PARAKEET_MODEL="tdt-600m"
export HF_REPO="nvidia/parakeet-tdt-0.6b-v3"
export NEMO_FILE="parakeet-tdt-0.6b-v3.nemo"
export CONVERT_MODEL="600m-tdt"
export VOCAB_FILE="tdt-600m.tokenizer.vocab"
```

### English-Only, Smaller and Faster

Use this for the compact English-only model:

```bash
export MINUTES_PARAKEET_MODEL="tdt-ctc-110m"
export HF_REPO="nvidia/parakeet-tdt_ctc-110m"
export NEMO_FILE="parakeet-tdt_ctc-110m.nemo"
export CONVERT_MODEL="110m-tdt-ctc"
export VOCAB_FILE="tdt-ctc-110m.tokenizer.vocab"
```

The underscore in `parakeet-tdt_ctc-110m.nemo` is real. The local Minutes model
directory still uses the hyphenated key `tdt-ctc-110m`.

## Apple Silicon Install

This is the shortest complete path for macOS on Apple Silicon.

Prerequisites:

- Full Xcode, not only Command Line Tools. Metal needs the full shader compiler.
- CMake. Recent CMake versions work with the install-disable flags below.
- Rust, if you are building the Minutes CLI from source.
- Python 3 for the one-time model conversion.

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

Those flags are intentional:

- `PARAKEET_BUILD_SERVER_EXAMPLE=ON` builds `example-server`, the warm sidecar
  Minutes can reuse for live transcription.
- `AXIOM_INSTALL=OFF` and `PARAKEET_INSTALL=OFF` skip CMake install/export
  rules that are not needed when copying binaries by hand. They also avoid the
  common `AxiomTargets` / `hwy` export-set error.

Copy both binaries to a stable location:

```bash
mkdir -p ~/.local/bin
find build -type f -perm -u+x \( -name parakeet -o -name example-server \) \
  -exec cp -f {} ~/.local/bin/ \;

ls -lh ~/.local/bin/parakeet ~/.local/bin/example-server
```

The `find` command handles both common CMake layouts. Ninja often places
binaries in `build/bin/`; Unix Makefiles may place them in `build/` and
`build/examples/server/`.

Optional Metal linkage check:

```bash
otool -L ~/.local/bin/parakeet | grep -E 'Metal|MPS|MPSGraph|Accelerate'
```

### 2. Install a Minutes Binary With Parakeet Support

The Minutes binary that performs transcription must be compiled with the
`parakeet` feature.

If you are building the CLI from this repo:

```bash
cd <path/to/minutes>
cargo build --release -p minutes-cli --features parakeet
mkdir -p ~/.local/bin
cp -f target/release/minutes ~/.local/bin/minutes
```

Make sure your shell sees the binary you just installed:

```bash
export PATH="$HOME/.local/bin:$PATH"
which minutes
minutes --version
```

The Homebrew Formula CLI may be whisper-only. It can still run
`minutes setup --parakeet` because that setup command is not feature-gated, but
you still need a Parakeet-enabled Minutes binary for actual transcription.

### 3. Write the Bundled Parakeet VAD File

Run setup for the model you selected:

```bash
minutes setup --parakeet --parakeet-model "$MINUTES_PARAKEET_MODEL"
```

This command:

- writes `~/.minutes/models/parakeet/silero_vad_v5.safetensors`
- creates `~/.minutes/models/parakeet/$MINUTES_PARAKEET_MODEL/`
- checks whether a `parakeet` binary is discoverable
- prints a manual model-conversion recipe

It does not download the `.nemo` model, run conversion, or extract the tokenizer
vocab. Those are the next step.

### 4. Download and Convert the Model

Run conversion from the `parakeet.cpp` clone. The clone contains
`scripts/convert_nemo.py`.

Use a throwaway Python environment so `python`, `pip`, and the `hf` downloader
all refer to the same interpreter:

```bash
python3 -m venv ~/parakeet-convert-env
source ~/parakeet-convert-env/bin/activate
python -m pip install numpy safetensors torch torchaudio huggingface_hub packaging
```

Download the selected model and convert it:

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

Clean up the large temporary download when conversion is done:

```bash
rm -f "$NEMO_FILE"
deactivate
```

At this point the runtime files should look like this for `tdt-600m`:

```text
~/.minutes/models/parakeet/
  silero_vad_v5.safetensors
  tdt-600m/
    tdt-600m.safetensors
    tdt-600m.tokenizer.vocab
```

For `tdt-ctc-110m`, the directory and filenames use `tdt-ctc-110m` instead.

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
parakeet_fp16 = true
```

For `tdt-ctc-110m`:

```toml
[transcription]
engine = "parakeet"
parakeet_model = "tdt-ctc-110m"
parakeet_binary = "/Users/you/.local/bin/parakeet"
parakeet_vocab = "tdt-ctc-110m.tokenizer.vocab"
parakeet_sidecar_enabled = true
parakeet_fp16 = true
```

Use an absolute `parakeet_binary` path for the desktop app. Apps launched from
Finder, Spotlight, or the Dock may not inherit your shell `PATH`, even when the
same binary works from Terminal.

`parakeet_sidecar_enabled = true` lets live transcription reuse the warm
`example-server` process. Without it, live mode can fall back to spawning
`parakeet` for each utterance, which repeatedly reloads the model and feels
slow.

`parakeet_fp16 = true` is the default on Apple Silicon, but keeping it explicit
in the Parakeet config makes the intended fast path obvious.

### 6. Verify

Check the installed binaries and model files:

```bash
test -x ~/.local/bin/parakeet
test -x ~/.local/bin/example-server
test -f ~/.minutes/models/parakeet/silero_vad_v5.safetensors
test -f "$HOME/.minutes/models/parakeet/$MINUTES_PARAKEET_MODEL/$MINUTES_PARAKEET_MODEL.safetensors"
test -f "$HOME/.minutes/models/parakeet/$MINUTES_PARAKEET_MODEL/$VOCAB_FILE"
```

Then run:

```bash
minutes health
```

Finally, process a short known audio file or make a short test recording and
confirm the transcript is produced with `engine = "parakeet"`.

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
| `~/.minutes/models/silero-vad-v6.2.0.onnx` | optional streaming VAD engine if built with `vad-ort` |

`minutes setup --parakeet` writes only the Parakeet VAD file. Normal
`minutes setup` downloads the Whisper VAD artifacts.

## What Parakeet Covers in Minutes

When `engine = "parakeet"` is configured and the running Minutes binary has
Parakeet support compiled in, Minutes can use Parakeet for:

- post-recording batch transcription
- desktop processing
- folder watcher processing
- recording-sidecar live transcription during `minutes record`
- standalone live transcription through `minutes live` and desktop Live Mode
- final utterance transcription in dictation when `[dictation] backend = "parakeet"`

Dictation still uses Whisper for progressive partial text. If Parakeet is not
available for a finalized utterance, dictation falls back to Whisper for that
utterance.

Whisper remains the fallback for live paths when Parakeet fails mid-session, so
unusual builds that enable Parakeet while disabling the default `whisper`
feature cannot run `minutes live`.

## Linux With NVIDIA GPU

The native `parakeet.cpp` path does not currently provide CUDA acceleration.
CPU-only builds work, but lose the main speed advantage.

On Linux with NVIDIA GPUs, NVIDIA's NeMo toolkit can run Parakeet with CUDA. The
`parakeet_binary` config key accepts any executable that follows the
`parakeet.cpp` CLI contract, so Minutes can point at a wrapper script around
NeMo instead of the native `parakeet.cpp` binary.

This approach works, but a simple wrapper reloads the NeMo model for each audio
chunk. For long recordings, a persistent daemon that keeps the model resident in
VRAM is the better shape.

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
rm -rf build
cmake -B build -DCMAKE_BUILD_TYPE=Release \
  -DPARAKEET_BUILD_SERVER_EXAMPLE=ON \
  -DAXIOM_INSTALL=OFF \
  -DPARAKEET_INSTALL=OFF
cmake --build build -j
```

Minutes copies the two binaries manually and does not need `cmake --install`.

### Atomics error: `Neither lock free instructions nor -latomic found`

This is an environment-sensitive Highway probe failure on some macOS toolchains.
Build normally first. If you hit this error, use CMake 3.31.x for the
`parakeet.cpp` build shell:

```bash
curl -L -o /tmp/cmake-3.31.12.tar.gz \
  https://github.com/Kitware/CMake/releases/download/v3.31.12/cmake-3.31.12-macos-universal.tar.gz
tar xf /tmp/cmake-3.31.12.tar.gz -C /tmp
export PATH="/tmp/cmake-3.31.12-macos-universal/CMake.app/Contents/bin:$PATH"
cmake --version
```

Then remove and recreate the `build` directory before configuring again.

### Metal shader compiler not found

Install full Xcode, accept the license, select it, and download the Metal
toolchain:

```bash
sudo xcodebuild -license accept
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
xcodebuild -downloadComponent MetalToolchain
```

Command Line Tools alone are not enough for the Metal build.

### `hf: command not found`

Activate the conversion venv and reinstall `huggingface_hub`:

```bash
source ~/parakeet-convert-env/bin/activate
python -m pip install huggingface_hub
```

The `hf` command is only needed during model download. It is not needed at
runtime.

### Conversion fails with missing Python packages

Use the dependency line from this guide inside the active venv:

```bash
python -m pip install numpy safetensors torch torchaudio huggingface_hub packaging
```

`numpy` is required by the safetensors save path used during conversion. Do not
rely on it arriving as a transitive dependency of PyTorch.
