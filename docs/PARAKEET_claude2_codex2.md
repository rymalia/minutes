# Parakeet Engine Setup

Minutes can transcribe with [parakeet.cpp](https://github.com/Frikallo/parakeet.cpp)
instead of Whisper. Parakeet uses NVIDIA's FastConformer architecture: lower word
error rate than Whisper at comparable model sizes, and much faster inference on
Apple Silicon through Metal.

This guide is for the native `parakeet.cpp` path on macOS Apple Silicon. Minutes
runs an external `parakeet` binary, points it at converted model files, and passes
it a Parakeet-specific Silero VAD file.

## How a Parakeet Install Is Shaped

A working install has three runtime binaries and three runtime model assets.
Everything else is scaffolding.

```text
Phase 1: build binaries              Phase 2: install model              Phase 3: configure
one time per machine                  one time per model                  edit one file

parakeet.cpp clone --cmake--+
                             +--> ~/.local/bin/parakeet
                             +--> ~/.local/bin/example-server

minutes repo or release ----+--> minutes binary with parakeet feature

minutes setup --parakeet --------> ~/.minutes/models/parakeet/silero_vad_v5.safetensors

HuggingFace .nemo download --convert_nemo.py--> ~/.minutes/models/parakeet/<model>/<model>.safetensors
HuggingFace .nemo download --tar extract------> ~/.minutes/models/parakeet/<model>/<model>.tokenizer.vocab

~/.config/minutes/config.toml selects engine = "parakeet" and points at these files.
```

What you keep at runtime:

| Runtime artifact | Made by | Lives at |
|------------------|---------|----------|
| `parakeet` binary | CMake build of `parakeet.cpp` | `~/.local/bin/parakeet` |
| `example-server` binary | same CMake build | `~/.local/bin/example-server` |
| `minutes` binary with `parakeet` feature | Minutes release or local Rust build | release location or `~/.local/bin/minutes` |
| `silero_vad_v5.safetensors` | `minutes setup --parakeet` extracts bundled bytes | `~/.minutes/models/parakeet/` |
| `<model>.safetensors` | `convert_nemo.py` converts the downloaded `.nemo` | `~/.minutes/models/parakeet/<model>/` |
| `<model>.tokenizer.vocab` | `tar` extracts it from the downloaded `.nemo` | `~/.minutes/models/parakeet/<model>/` |

What is only scaffolding:

| Scaffolding | Needed for | Safe to delete after |
|-------------|------------|----------------------|
| `parakeet.cpp` clone | building binaries and running `scripts/convert_nemo.py` | model conversion finishes, unless you plan to add another model or rebuild |
| downloaded `.nemo` file | conversion and tokenizer extraction | conversion finishes |
| Python venv | conversion dependencies | conversion finishes |

Two facts prevent most install confusion:

- The `.nemo` file and the `parakeet.cpp` clone are not read at transcription
  time. They are inputs to the build and conversion phases only.
- `minutes setup --parakeet` does not download or convert a model. It writes the
  bundled Parakeet VAD file, creates the model directory, checks for a
  `parakeet` binary, and prints the manual conversion recipe.

## Before You Start

| Need | Why | Install |
|------|-----|---------|
| Full Xcode | Metal needs the full shader compiler; Command Line Tools alone are not enough | App Store, then the commands below |
| CMake | builds `parakeet.cpp` | any recent version works with the flags below |
| Rust | only if building the Minutes CLI yourself | [rustup.rs](https://rustup.rs) |
| Python 3 | one-time model conversion | already present on most macOS installs |

Point macOS at full Xcode and fetch the Metal toolchain:

```bash
sudo xcodebuild -license accept
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
xcodebuild -downloadComponent MetalToolchain
```

Recent CMake versions work. The build flags below handle the common
`install(EXPORT)` / `AxiomTargets` error on every tested CMake version, including
3.31.x, 4.3.2, and 4.3.3. CMake 3.31.x remains the fallback for a rare,
environment-specific atomics probe failure; use it only if you hit that error.

## Choose Your Model

The install flow below is written for `tdt-600m`, the recommended multilingual
model. If you want the compact English-only model, substitute the values in the
right column.

| Where it appears | `tdt-600m` | `tdt-ctc-110m` |
|------------------|------------|----------------|
| HuggingFace repo | `nvidia/parakeet-tdt-0.6b-v3` | `nvidia/parakeet-tdt_ctc-110m` |
| `.nemo` filename | `parakeet-tdt-0.6b-v3.nemo` | `parakeet-tdt_ctc-110m.nemo` |
| `convert_nemo.py --model` | `600m-tdt` | `110m-tdt-ctc` |
| local model key | `tdt-600m` | `tdt-ctc-110m` |
| vocab filename | `tdt-600m.tokenizer.vocab` | `tdt-ctc-110m.tokenizer.vocab` |

The underscore in the 110m HuggingFace repo and `.nemo` filename is real. The
local Minutes model key is still hyphenated: `tdt-ctc-110m`.

To keep commands copyable, set variables for the model you want.

For `tdt-600m`:

```bash
export MODEL="tdt-600m"
export HF_REPO="nvidia/parakeet-tdt-0.6b-v3"
export NEMO_FILE="parakeet-tdt-0.6b-v3.nemo"
export CONVERT_MODEL="600m-tdt"
export VOCAB_FILE="tdt-600m.tokenizer.vocab"
```

For `tdt-ctc-110m`:

```bash
export MODEL="tdt-ctc-110m"
export HF_REPO="nvidia/parakeet-tdt_ctc-110m"
export NEMO_FILE="parakeet-tdt_ctc-110m.nemo"
export CONVERT_MODEL="110m-tdt-ctc"
export VOCAB_FILE="tdt-ctc-110m.tokenizer.vocab"
```

## Phase 1: Build the Binaries

This phase does not need a model. It produces the external executables Minutes
will use later.

### Build `parakeet` and `example-server`

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
  used by live transcription.
- `AXIOM_INSTALL=OFF` and `PARAKEET_INSTALL=OFF` skip CMake install/export rules
  that are not needed when Minutes copies binaries by hand. They also avoid the
  common `AxiomTargets` / `hwy` export-set error.

Copy both binaries to a stable location:

```bash
mkdir -p ~/.local/bin
find build -type f -perm -u+x \( -name parakeet -o -name example-server \) \
  -exec cp -f {} ~/.local/bin/ \;

ls -lh ~/.local/bin/parakeet ~/.local/bin/example-server
```

The `find` command is intentional. CMake generators put binaries in different
places: Ninja commonly uses `build/bin/`, while Unix Makefiles may place them in
`build/` and `build/examples/server/`.

`example-server` is the warm sidecar. Live mode can reuse one loaded model across
utterances through it. Without it, live mode may spawn a fresh `parakeet`
subprocess per utterance and reload the model each time.

Optional Apple Silicon linkage check:

```bash
otool -L ~/.local/bin/parakeet | grep -E 'Metal|MPS|MPSGraph|Accelerate'
```

### Install a Minutes Binary With Parakeet Support

The Minutes binary that performs transcription must be compiled with the
`parakeet` feature.

If you are building the CLI from this repo:

```bash
cd <path/to/minutes>
cargo build --release -p minutes-cli --features parakeet
mkdir -p ~/.local/bin
cp -f target/release/minutes ~/.local/bin/minutes

export PATH="$HOME/.local/bin:$PATH"
which minutes
minutes --version
```

If you use a signed desktop app or prebuilt CLI, verify that the artifact you
installed includes Parakeet support. The Homebrew Formula CLI may be whisper-only:
it can still run `minutes setup --parakeet`, but it is not the binary you want
doing Parakeet transcription unless it was built with the feature.

## Phase 2: Install a Model

### Write the Bundled Parakeet VAD File

```bash
minutes setup --parakeet --parakeet-model "$MODEL"
```

This writes:

```text
~/.minutes/models/parakeet/silero_vad_v5.safetensors
```

It also creates the selected model directory and checks whether `parakeet` is
discoverable. It does not download the `.nemo` model, convert it, or extract the
tokenizer vocab.

### Download and Convert the Model

Use a throwaway Python venv so `python`, `pip`, and the `hf` downloader all share
one interpreter:

```bash
python3 -m venv ~/parakeet-convert-env
source ~/parakeet-convert-env/bin/activate
python -m pip install numpy safetensors torch torchaudio huggingface_hub packaging
```

`numpy` is required. `convert_nemo.py` saves through `safetensors.torch.save_file()`,
which needs numpy, but safetensors declares numpy as an optional extra and modern
PyTorch may not install it transitively. Installing it explicitly avoids a
late conversion failure.

Run the conversion from inside the `parakeet.cpp` clone:

```bash
cd ~/src/parakeet.cpp

hf download "$HF_REPO" "$NEMO_FILE" --local-dir .

export MODEL_DIR="$HOME/.minutes/models/parakeet/$MODEL"
mkdir -p "$MODEL_DIR"

python scripts/convert_nemo.py "$NEMO_FILE" \
  -o "$MODEL_DIR/$MODEL.safetensors" \
  --model "$CONVERT_MODEL"
```

### Extract the Tokenizer Vocab

`parakeet.cpp` needs the SentencePiece `tokenizer.vocab`, not a plain
`vocab.txt`. macOS ships BSD tar, which does not support GNU tar's `--wildcards`
flag, so capture the exact filename first:

```bash
vocab=$(tar tf "$NEMO_FILE" | grep -m1 tokenizer.vocab)
tar xf "$NEMO_FILE" "$vocab"
cp -f "$vocab" "$MODEL_DIR/$VOCAB_FILE"
```

GNU tar users can do the extraction in one command:

```bash
tar xf "$NEMO_FILE" --wildcards --no-anchored '*tokenizer.vocab'
```

You should now have, for `tdt-600m`:

```text
~/.minutes/models/parakeet/
  silero_vad_v5.safetensors
  tdt-600m/
    tdt-600m.safetensors
    tdt-600m.tokenizer.vocab
```

For `tdt-ctc-110m`, the directory and filenames use `tdt-ctc-110m` instead.

## Phase 3: Configure Minutes

Edit `~/.config/minutes/config.toml`. This is a file edit; do not paste the TOML
block into a shell.

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
Finder, Spotlight, or the Dock may not inherit your shell `PATH`, so
`which parakeet` can succeed in Terminal while the desktop app still reports
`parakeet binary not found`.

`parakeet_sidecar_enabled = true` lets live transcription reuse the warm
`example-server` process.

`parakeet_fp16 = true` is the default on Apple Silicon, but keeping it explicit
documents the intended fast path.

## Verify

Check the installed files:

```bash
test -x ~/.local/bin/parakeet && echo "parakeet OK"
test -x ~/.local/bin/example-server && echo "example-server OK"
test -f ~/.minutes/models/parakeet/silero_vad_v5.safetensors && echo "vad OK"
test -f "$HOME/.minutes/models/parakeet/$MODEL/$MODEL.safetensors" && echo "model OK"
test -f "$HOME/.minutes/models/parakeet/$MODEL/$VOCAB_FILE" && echo "vocab OK"
```

Check the Minutes configuration:

```bash
minutes health
```

Then process a short known audio file or make a short test recording and confirm
the transcript is produced with `engine = "parakeet"`.

Switching back to Whisper later is only a config change:

```toml
[transcription]
engine = "whisper"
```

No rebuild is needed when both engines are compiled into the same binary.

## Clean Up

Once the binaries are copied and the selected model is converted, the scaffolding
can be removed:

```bash
deactivate 2>/dev/null
rm -rf ~/parakeet-convert-env
rm -f "$HOME/src/parakeet.cpp/$NEMO_FILE"
```

Keep `~/src/parakeet.cpp` if you expect to install another model soon or rebuild
the binaries after upstream changes. Otherwise it is safe to delete after Phase 2.

Do not delete the runtime artifacts:

- `~/.local/bin/parakeet`
- `~/.local/bin/example-server`
- `~/.minutes/models/parakeet/silero_vad_v5.safetensors`
- `~/.minutes/models/parakeet/<model>/<model>.safetensors`
- `~/.minutes/models/parakeet/<model>/<model>.tokenizer.vocab`

# Reference

The rest of this document is reference material. You do not need it to get a
basic Apple Silicon install working.

## Where Parakeet Is Used

When `engine = "parakeet"` is configured and the running Minutes binary has
Parakeet support compiled in, Minutes can use Parakeet for:

- post-recording batch transcription (`minutes process`, desktop processing, and the shared cleanup pipeline)
- folder watcher processing
- recording-sidecar live transcription during `minutes record`
- standalone live transcription through `minutes live` and desktop Live Mode
- final utterance transcription in dictation when `[dictation] backend = "parakeet"`

Dictation still uses Whisper for progressive partial text. With
`[dictation] backend = "parakeet"`, Parakeet handles the final utterance after
VAD finalization. If Parakeet is unavailable for that utterance, dictation falls
back to Whisper.

Whisper remains the runtime fallback for live paths when Parakeet fails
mid-session, so unusual builds that enable Parakeet while disabling the default
`whisper` feature cannot run `minutes live`.

Parakeet is also the first runtime fallback behind the experimental Apple Speech
standalone-live path: if `engine = "apple-speech"` cannot run or fails
mid-session, Minutes tries a ready Parakeet backend before falling back to
Whisper. See [`docs/APPLE_SPEECH.md`](APPLE_SPEECH.md).

## Language Support

| Model | Languages |
|-------|-----------|
| `tdt-ctc-110m` | English only |
| `tdt-600m` | 25 European languages: Bulgarian, Croatian, Czech, Danish, Dutch, English, Estonian, Finnish, French, German, Greek, Hungarian, Italian, Latvian, Lithuanian, Maltese, Polish, Portuguese, Romanian, Russian, Slovak, Slovenian, Spanish, Swedish, Ukrainian |

For languages outside this list, use Whisper.

## VAD Files

A complete Minutes install can carry several Silero VAD artifacts. They are not
interchangeable.

| File | Used by |
|------|---------|
| `~/.minutes/models/parakeet/silero_vad_v5.safetensors` | Parakeet / `parakeet.cpp` native VAD |
| `~/.minutes/models/ggml-silero-v6.2.0.bin` | Whisper path / whisper-rs Silero VAD |
| `~/.minutes/models/silero-vad-v6.2.0.onnx` | optional streaming VAD if built with `vad-ort` |

`minutes setup --parakeet` writes only the Parakeet VAD file. Plain
`minutes setup` downloads the Whisper VAD artifacts.

## Full `[transcription]` Reference

```toml
[transcription]
engine = "parakeet"
parakeet_model = "tdt-600m"
parakeet_binary = "/Users/you/.local/bin/parakeet"
parakeet_vocab = "tdt-600m.tokenizer.vocab"
parakeet_sidecar_enabled = true
parakeet_fp16 = true
parakeet_boost_limit = 25
parakeet_boost_score = 2.0
```

`parakeet_boost_limit` and `parakeet_boost_score` are experimental graph-derived
boosting controls. Leave them unset unless you are intentionally tuning boosts.

## Building the Desktop App With Parakeet

```bash
TAURI_FEATURES="parakeet" cargo tauri build --bundles app
```

In this repo, prefer the helper scripts so the CLI and desktop app stay on the
same feature set:

```bash
MINUTES_BUILD_FEATURES=parakeet,metal ./scripts/build.sh
MINUTES_BUILD_FEATURES=parakeet,metal ./scripts/install-dev-app.sh
```

The `parakeet` feature is opt-in. Whisper is a default feature, so both engines
can coexist in one binary and the config file selects which one runs.

## Linux and Windows

`parakeet.cpp` can build CPU-only on Linux and Windows, but it does not currently
provide CUDA acceleration. CPU-only builds work, but lose the main speed
advantage. Watch the
[parakeet.cpp repo](https://github.com/Frikallo/parakeet.cpp) for CUDA progress.

## Linux With an NVIDIA GPU

On Linux with NVIDIA GPUs, NVIDIA's [NeMo toolkit](https://github.com/NVIDIA/NeMo)
can run Parakeet with CUDA. The `parakeet_binary` config key accepts any
executable that follows the `parakeet.cpp` CLI contract, so Minutes can point at
a wrapper script around NeMo instead of the native `parakeet.cpp` binary.

```bash
python3 -m venv ~/parakeet-env
source ~/parakeet-env/bin/activate
pip install nemo_toolkit[asr]
```

Save this as `~/bin/parakeet-nemo` and `chmod +x` it:

```bash
#!/bin/bash
source ~/parakeet-env/bin/activate

python3 - "$@" << 'EOF'
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
EOF
```

Point Minutes at it:

```toml
[transcription]
engine = "parakeet"
parakeet_binary = "/home/you/bin/parakeet-nemo"
parakeet_model = "tdt-600m"
parakeet_vocab = "tdt-600m.tokenizer.vocab"
```

Known limitation: the wrapper reloads the model on every chunk. A persistent
daemon that keeps the model resident in VRAM removes that overhead.

## Troubleshooting

### `parakeet binary not found`

The launching process probably cannot see your shell `PATH`. This is common for
Finder, Spotlight, and Dock launches. Set an absolute path:

```toml
[transcription]
parakeet_binary = "/Users/you/.local/bin/parakeet"
```

### `unknown parakeet model`

Only these model keys are currently supported:

- `tdt-600m`
- `tdt-ctc-110m`

### `Expected parakeet model in ~/.minutes/models/parakeet/`

`minutes setup --parakeet` wrote the VAD file and created the directory, but the
converted model files are missing. Complete Phase 2.

### Parakeet Config Is Set, but Transcription Still Uses Whisper

The running Minutes binary may not have been built with the `parakeet` feature.
Use a Parakeet-enabled release artifact, or rebuild the CLI or desktop app with
the `parakeet` feature.

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

Minutes copies binaries manually and does not need `cmake --install`.

### Atomics error: `Neither lock free instructions nor -latomic found`

This is an environment-specific Highway probe failure on some macOS toolchains.
Build normally first. If you hit this error, use CMake 3.31.x for the
`parakeet.cpp` build shell:

```bash
curl -L -o /tmp/cmake-3.31.12.tar.gz \
  https://github.com/Kitware/CMake/releases/download/v3.31.12/cmake-3.31.12-macos-universal.tar.gz
tar xf /tmp/cmake-3.31.12.tar.gz -C /tmp
export PATH="/tmp/cmake-3.31.12-macos-universal/CMake.app/Contents/bin:$PATH"
cmake --version
```

Then `rm -rf build` and reconfigure.

### Metal shader compiler not found

Full Xcode is required, not just Command Line Tools:

```bash
sudo xcodebuild -license accept
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
xcodebuild -downloadComponent MetalToolchain
```

### `hf: command not found`

Activate the conversion venv and reinstall `huggingface_hub`:

```bash
source ~/parakeet-convert-env/bin/activate
python -m pip install huggingface_hub
```

### `convert_nemo.py`: `No module named 'numpy'`

Install the full dependency line inside the active conversion venv:

```bash
python -m pip install numpy safetensors torch torchaudio huggingface_hub packaging
```

`numpy` is required by the safetensors save path used during conversion. Do not
rely on it arriving as a transitive dependency of PyTorch.
