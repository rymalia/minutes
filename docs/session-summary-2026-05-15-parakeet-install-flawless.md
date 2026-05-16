---
date: 2026-05-15
time: "1:51 PM PDT – 5:53 PM PDT"
project: minutes
---

## Overview

End-to-end install of the Parakeet transcription engine + Apple Silicon Metal acceleration on the user's M3 Air, starting from a confused state (stale cargo CLI, no parakeet binary, no model, config pointing at a non-existent binary) and ending with two flawless test recordings. Catalogued 9 errors and outdated claims in `docs/PARAKEET.md` along the way, captured in a project memory file for a follow-up docs-revision session.

## Key Decisions Made

- **Kept `/Applications/Minutes.app` (direct DMG install) as the canonical desktop install.** It's maintainer-signed v0.18.0 with Parakeet + Metal compiled in, and auto-updates via the built-in Tauri `minutes-updater`. Did NOT install the Homebrew cask — `brew info --cask silverstein/tap/minutes` showed 0.17.3, which lags the direct DMG releases. The cask would have stepped on the working in-app updater.
- **Used the maintainer's `AXIOM_INSTALL=OFF` + `PARAKEET_INSTALL=OFF` CMake flags** instead of PARAKEET.md's `brew install cmake@3` workaround. The parakeet.cpp maintainer added these flags explicitly in `CMakeLists.txt:96-100` to handle the install(EXPORT) strictness issue — they're a cleaner fix than fighting CMake versions, and they work on both CMake 3.x and 4.x. (Though we still needed CMake 3.31.12 for an upstream-axiom code path; just not for the EXPORT problem PARAKEET.md describes.)
- **Manual `.nemo` download via `curl` rather than `huggingface_hub`.** The HF URL for public models redirects to a CDN with no auth required, so we saved a Python dep. Verified with `curl -sIL` first.
- **`uv pip install` into a dedicated venv at `~/.local/venvs/parakeet-convert/`** per user preference — keeps torch (~700 MB) isolated from system Python, deletable in one command if no longer needed.
- **Brew CLI (whisper-only build) kept on the machine.** Useful for `minutes setup --parakeet` (which installs Silero VAD weights even on a non-parakeet build) and stays current via `brew upgrade`. The user's transcription happens through the .app, which has the full parakeet feature.
- **Hand off docs revision to a fresh agent in a new session.** Rationale: the investigative thrash in this session's working context would degrade the quality of opinionated prose edits. The `project_parakeet_install.md` memory file is structured as a PR brief — fresh agent gets clean inputs.

## Changes Made

| Change | Detail |
|--------|--------|
| **Removed stale cargo CLI** | `cargo uninstall minutes-cli` — was v0.9.4 at `~/.cargo/bin/minutes`, nine versions behind, shadowing everything else on PATH |
| **Installed CMake 3.31.12** | Kitware official universal tarball → `~/.local/opt/cmake-3.31.12-macos-universal/` (system cmake 4.3.2 left alone) |
| **Built parakeet.cpp from source** | Clone at `~/src/parakeet.cpp/`. Configured with `-DAXIOM_INSTALL=OFF -DPARAKEET_INSTALL=OFF -DPARAKEET_BUILD_SERVER_EXAMPLE=ON -DAXIOM_BUILD_TESTS=OFF -DAXIOM_BUILD_EXAMPLES=OFF`. Unix Makefiles generator (no Ninja installed). |
| **Installed parakeet binaries** | `~/.local/bin/parakeet` + `~/.local/bin/example-server` (9.5 MB + 9.4 MB; linked against Metal + MPS + MPSGraph + Accelerate) |
| **Installed brew CLI** | `brew install silverstein/tap/minutes` → `/opt/homebrew/bin/minutes` v0.18.0 (whisper-only build, used for `setup --parakeet`) |
| **Set up uv venv + Python deps** | `~/.local/venvs/parakeet-convert/` with `torch`, `safetensors`, `packaging`, `numpy` (Python 3.13.11) |
| **Downloaded .nemo model** | `curl` from `https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3/resolve/main/parakeet-tdt-0.6b-v3.nemo` (2.4 GB) to `/tmp/parakeet-dl/`. Deleted after conversion. |
| **Converted model to safetensors** | `python scripts/convert_nemo.py --model 600m-tdt` → `~/.minutes/models/parakeet/tdt-600m/tdt-600m.safetensors` (2.3 GB, 627M params, 723 tensors mapped) |
| **Extracted tokenizer vocab** | BSD-tar workaround (literal UUID filename instead of `--wildcards`) → `~/.minutes/models/parakeet/tdt-600m/tdt-600m.tokenizer.vocab` (99 KB) |
| **Updated `~/.config/minutes/config.toml`** | `parakeet_binary` set to absolute path; `parakeet_sidecar_enabled = true` for warm sidecar in live mode |
| **Created memory file** | `~/.claude/projects/-Users-rymalia-projects-minutes/memory/project_parakeet_install.md` documenting 9 PARAKEET.md gotchas + canonical install paths for this machine. Indexed in MEMORY.md. |

## Research Performed

- Audited the user's existing install state: bundle signing, CLI versions, brew tap status, config contents, model dir contents, parakeet binary search paths
- Inspected `/Applications/Minutes.app/Contents/MacOS/minutes-app` via `otool -L` and `strings` to confirm Parakeet + Metal features compiled into the DMG
- Read `crates/cli/src/main.rs:5415-5437` to verify what `minutes setup --parakeet` actually does on a whisper-only build (turned out: not what PARAKEET.md implies)
- Read `~/src/parakeet.cpp/CMakeLists.txt:96-100` and `~/src/parakeet.cpp/third_party/axiom/CMakeLists.txt:716` to find the maintainer's escape hatch for the install(EXPORT) strictness issue
- Verified HF .nemo URL is publicly curl-able (HTTP 302 → 200, no auth) to skip the `huggingface_hub` Python dep
- Investigated Frikallo/parakeet.cpp's GitHub Releases for prebuilt binaries (none published as of 2026-05-15)
- Inspected `convert_nemo.py` imports to confirm minimum Python deps (torch + safetensors only, not torchaudio)

## Discoveries / Handoff Notes

These are captured in detail in `project_parakeet_install.md` but worth surfacing in the summary too:

- **PARAKEET.md "Option A: Use Minutes setup (recommended)" is misleading.** In v0.18.0, `minutes setup --parakeet` only installs Silero VAD weights and resolves the parakeet binary path. The actual model download + conversion is the same manual flow as Option B — the CLI just prints those instructions. The "recommended" label should either move to Option B or the CLI should be updated to actually do the work.
- **Homebrew dropped the `cmake@3` formula.** PARAKEET.md's `brew install cmake@3` no longer works. Use Kitware's CMake 3.31.12 universal tarball from GitHub releases, extracted to a local opt dir.
- **CMake version alone does NOT fix the parakeet.cpp build.** The real fix is two CMake flags the maintainer added: `-DAXIOM_INSTALL=OFF -DPARAKEET_INSTALL=OFF`. PARAKEET.md should be rewritten around these.
- **`make build` with Unix Makefiles puts binaries in `build/` and `build/examples/server/`**, not `build/bin/` like PARAKEET.md says. PARAKEET.md assumes Ninja generator.
- **Server example is not built by default.** Add `-DPARAKEET_BUILD_SERVER_EXAMPLE=ON` or the warm sidecar binary `example-server` is missing — live mode degrades to per-utterance subprocess spawn (visibly slow).
- **macOS BSD `tar` doesn't have `--wildcards`.** PARAKEET.md's extract command is GNU-tar-only. On macOS, list the .nemo archive (`tar tf`) and extract by literal UUID-prefixed filename.
- **`safetensors` Python package has a transitive `packaging` dep that isn't auto-pulled.** Add `packaging` (and `numpy` to silence a torch warning) to the install list. PARAKEET.md lists `pip install safetensors torch torchaudio huggingface_hub` — drop `torchaudio` (convert_nemo.py doesn't use it), drop `huggingface_hub` if using curl, add `packaging`.
- **.nemo is publicly curl-able from `https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3/resolve/main/parakeet-tdt-0.6b-v3.nemo`** — HF transparently redirects to the xet-hub CDN with no auth required.
- **The Homebrew cask `silverstein/tap/minutes` lagged the direct DMG release** (0.17.3 vs 0.18.0 in `/Applications/`). Direct DMG → in-app updater is currently the more current channel.

## Current State

```
/Applications/Minutes.app                    v0.18.0, signed by Mathieu Silverstein
                                             (in-app auto-update; do not replace with cask)
/opt/homebrew/bin/minutes                    v0.18.0, brew formula (whisper-only)
~/.local/bin/parakeet                        Metal+MPS+MPSGraph+Accelerate linked
~/.local/bin/example-server                  Warm sidecar for live mode
~/.local/opt/cmake-3.31.12-macos-universal/  CMake 3.x (build-time only)
~/.local/venvs/parakeet-convert/             uv venv with torch+safetensors+packaging+numpy
~/src/parakeet.cpp/                          Source clone, build artifacts in build/
~/.minutes/models/parakeet/
  silero_vad_v5.safetensors                  1.2 MB
  tdt-600m/
    tdt-600m.safetensors                     2.3 GB (627M params)
    tdt-600m.tokenizer.vocab                 99 KB
~/.config/minutes/config.toml                engine=parakeet, absolute binary path,
                                             sidecar=true, fp16=true
```

Disk usage: 92% (36 GB free) — watched but not a blocker.

## Summary Statistics

- Files modified: 1 (`~/.config/minutes/config.toml`)
- Memory + docs files created: 2 (`project_parakeet_install.md`, this summary)
- New on-disk dependencies installed: 4 binaries (cmake 3.31.12, parakeet, example-server, brew minutes CLI) + Python venv with 4 packages
- Model data downloaded/generated: 2.4 GB downloaded (`.nemo`, deleted after) → 2.3 GB persisted (`tdt-600m.safetensors`) + 100 KB metadata
- PARAKEET.md issues catalogued: 9
- Test recordings completed successfully by user: 2
- Session duration: 4 hours 2 minutes

## Unfinished Work

- **Docs revision PR.** Handing off to a fresh agent in a new session. The follow-up prompt is:

  > Read `docs/session-summary-2026-05-15-parakeet-install-flawless.md` and `~/.claude/projects/-Users-rymalia-projects-minutes/memory/project_parakeet_install.md`. Revise `docs/PARAKEET.md` (and the install section of `README.md` if it overlaps) to fix the 9 issues documented there. Output as a draft PR with a clear changelog of what changed and why.

- **No `metadata.json` in `~/.minutes/models/parakeet/`.** Because we used the manual conversion path, the install metadata that `ParakeetInstallMetadata` writes (`crates/core/src/parakeet.rs`) is absent. Runtime may log `"install metadata is missing; rerun setup to persist provenance"` once — cosmetic, doesn't affect functionality. If it shows up and is annoying, we can synthesize the metadata file by hand.

- **`tdt-ctc-110m` not installed.** Only `tdt-600m` is set up. If the user wants to flip between models, the smaller English-only model requires a parallel run of the download+convert flow.

- **`brew uninstall silverstein/tap/minutes` is optional.** The user agreed the brew CLI can stay (auto-updates via `brew upgrade`, doesn't interfere with the .app). If they later decide they want zero CLI on PATH, one `brew uninstall` command does it cleanly.
