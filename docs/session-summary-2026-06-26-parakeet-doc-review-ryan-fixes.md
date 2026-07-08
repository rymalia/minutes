---
session_id: 4b9bd7a4-16bc-4c33-bfe3-e72551684772
date: 2026-06-26
time: "Jun 15 05:38 PM PDT – Jun 26 03:23 PM PDT"
project: minutes
branch: dev
---

# Session Summary — PARAKEET doc review + surgical fact-fixes to `PARAKEET_ryan.md`

## Overview

Reviewed four candidate rewrites of the Parakeet install guide for documentation
quality, then — after discovering the canonical doc had already moved on — pivoted
to surgically correcting factual errors in the preferred draft (`PARAKEET_ryan.md`)
against the live codebase, and trimming its model-install path to the verified-leanest
form.

## Key Decisions Made

- **Did not blind-merge the four drafts into `docs/PARAKEET.md`.** Verification
  showed `PARAKEET.md` already received a maintainer-approved rewrite (PR #250) that
  is *more* factually accurate than any of the four review drafts. Merging stale
  drafts over it would have been a regression. Surfaced this to the user instead of
  proceeding on the now-invalid original premise.
- **User chose "just fix ryan.md's facts"** (over grafting structure onto the landed
  doc, or overwriting `PARAKEET.md`). Scope held to factual corrections only; the
  draft's structure (three-phase overview, env-var model blocks, section order) was
  left intact.
- **Grounded every correction in source**, not plausible reasoning — per the
  standing "ground in real codebase" guidance. Each fix traces to a specific file,
  PR, or config default.
- **Switched the model download to the leanest verified path** (`curl` from the HF
  resolve URL; dropped `huggingface_hub` and `torchaudio`) on a follow-up request,
  matching what the landed `PARAKEET.md` already documents.

## Changes Made

All edits to `docs/PARAKEET_ryan.md`.

| Change | Detail |
|--------|--------|
| **Sidecar auto-resolve (3 spots)** | Config block + Scope live-path paragraph + "strongly recommended" line no longer present `parakeet_sidecar_enabled = true` as required. `config.rs:248` makes it `Option<bool>` (default `None` = auto); PR #295 auto-enables it when `example-server` resolves. `true` reframed as a *force*. |
| **`parakeet_boost_limit` default** | Comment corrected to "default 0 = disabled" (`config.rs:955`); kept `25` as the illustrative experimental opt-in. |
| **venv/`deactivate` seam** | 600m flow called `deactivate` on a venv it never created (only the 110m block created one). Added `python3 -m venv` + `source …/activate` so `deactivate` is valid and deps don't leak into system Python. |
| **CLI binary install** | `cp …/minutes` → `rm -f ~/.local/bin/minutes && cp …` per CLAUDE.md hard rule / PR #303 (in-place `cp` over a running binary invalidates its signature → SIGKILL on launch). |
| **Dangling anchor** | Delinked `[The two Silero VAD files](#the-two-silero-vad-files)` — no such section exists in this draft. |
| **Broken `#scope` link** | `See [Scope](#scope)` → `#scope-of-parakeet-integration-in-minutes` (actual heading slug). |
| **Trimmed Python deps** | `numpy safetensors torch torchaudio huggingface_hub packaging` → `torch safetensors packaging numpy`; comment explains why `packaging`/`numpy` are explicit. Both model blocks via one `replace_all`. |
| **`hf download` → `curl` (600m + 110m)** | Public HF resolve URLs, no auth / `huggingface_hub`. Download still lands inside the `parakeet.cpp` clone so `convert_nemo.py` relative paths resolve. |

## Research / Verification Performed

- **Read and critiqued 4 review drafts** (`PARAKEET_codex.md`, `_codex2.md`,
  `_claude.md`, `_claude2.md`) along documentation-quality axes: motivation,
  mental model, keep-vs-scaffolding framing, model-selection UX, troubleshooting
  depth, duplication/maintenance cost.
- **Read the landed `PARAKEET.md` (#250) and `PARAKEET_ryan.md`** to establish
  current ground truth before editing.
- **Codebase verification (grep, source reads):**
  - `crates/core/src/config.rs` — confirmed `parakeet_fp16` default `true`,
    `parakeet_boost_limit` default `0`, `parakeet_boost_score` default `2.0`,
    `parakeet_sidecar_enabled` is `Option<bool>` (auto/on/off), plus the extra
    `parakeet_fp16_blacklist_reset` key no draft mentions.
  - `crates/core/src/parakeet_sidecar.rs` — confirmed `MINUTES_PARAKEET_SERVER_BINARY`
    is a real env var.
  - `crates/core/src/config.rs` / `parakeet.rs` — confirmed `VALID_PARAKEET_MODELS`
    = `tdt-ctc-110m`, `tdt-600m`; default model `tdt-600m`.
- **Caught real errors carried by the review drafts**: `boost_limit = 25` mislabeled
  as default; sidecar shown as required; `numpy`-only (the real un-pulled transitive
  is `packaging`); `hf download` + `torchaudio` bloat vs. the curl path.

## Summary Statistics

- 9 edits applied to 1 file (`docs/PARAKEET_ryan.md`).
- 4 documentation drafts reviewed in depth + 2 canonical docs read.
- 4 source files grepped/read for config-key and behavior verification.
- 6 distinct factual-correctness defects fixed; 2 dependency/download methodology
  items brought to the verified-leanest path.

## Unfinished Work / Next Steps

- **Dead env-var blocks in `PARAKEET_ryan.md`'s "Install Models" section.** The
  `export HF_REPO=…`, `NEMO_FILE=…`, `CONVERT_MODEL=…`, `VOCAB_FILE=…` blocks are
  defined but never referenced — the commands below use hardcoded names. Left as-is
  (structure decision, user's call). Two clean resolutions offered: (a) wire the
  commands to the vars, or (b) drop the env-var blocks and keep the two fully
  spelled-out flows. **Awaiting user direction.**
- **Promotion of `ryan.md` → `docs/PARAKEET.md` is a separate, deliberate step.**
  This session only edited the candidate; the version on `main`/`dev` (from #250) is
  untouched and remains factually current.

## Discoveries / Handoff Notes

- **The four review drafts predate the landed doc.** `docs/PARAKEET.md` (PR #250) is
  the most current + verified version and already incorporates most of what the
  drafts proposed (Why-Parakeet table, sidecar auto-resolve, UUID tokenizer filename)
  *plus* corrections the drafts lack (curl over `hf download`, `packaging` as the real
  missing dep). Treat #250 as the factual baseline for any future Parakeet-doc work,
  not the `_codex*/_claude*` drafts.
- **`parakeet_sidecar_enabled` semantics changed in PR #295** ("sidecar auto-resolves
  from intent; status tells the truth"). Any doc still saying "set it to true for live
  mode" is stale — auto is the default and the key is now a force override.
- **Per-binary feature flags** (from memory, reconfirmed relevant): CLI built with
  `--features parakeet` does *not* give the Tauri app Parakeet; the app needs
  `TAURI_FEATURES="parakeet"`. The doc's build section already reflects this.
- Branch is `dev` (48+ commits ahead of `origin/dev` per recent memory); `PARAKEET_ryan.md`
  and the other draft variants are untracked working files.
