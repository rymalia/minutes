---
session_id: 20c10113-2227-4e35-ac35-2db00cbb4a4f
date: 2026-06-11
time: "2026-06-09 08:54 AM PDT – 2026-06-11 10:10 AM PDT"
resumed: "2026-06-10 10:11 AM PDT, 2026-06-10 10:02 PM PDT, 2026-06-11 09:20 AM PDT"
project: minutes
branch: docs/parakeet-install-rewrite
related_pr: 250
---

# Session Summary — PARAKEET.md trim, CMake forensics, and the numpy dogfood

## Overview

Resumed the long-running PR #250 (rewrite of `docs/PARAKEET.md` to fix Parakeet-on-Apple-Silicon install gotchas), corrected an over-confident CMake recommendation through independent forensic verification, expanded scope to sync the CLI's printed setup recipe with the doc, and — critically — ran a **from-scratch dogfood install of the tdt-ctc-110m model** that exposed a real missing dependency (`numpy`) the documentation had never named. The compact-model install is now validated end-to-end.

## How We Got Here

PR #250 was opened May 15, found to contain scope overreaches, and parked while 50+ upstream commits landed. This session picked it back up: synced `main`/`dev` to upstream, reset the PR branch to baseline, and re-applied only the verified gotcha fixes. Then a CMake claim I made triggered a trust breach, an investigation, a scope expansion, and finally a real-world dogfood that found the last bug.

## Key Decisions Made

| Decision | Rationale |
|----------|-----------|
| **CMake guidance: flags lead, 3.31.x is the atomics fallback** | Independent reproduction proved the install-disable flags are the universal fix; 3.31.x is only needed for the rare, environment-sensitive atomics probe failure. Endorsed by the maintainer and a second analyst. |
| **Expand PR #250 from docs-only to docs+code** | The CLI's `cmd_setup_parakeet` prints its own install recipe — a second instruction surface. Leaving it stale would hand users the exact broken commands the doc was fixing. User explicitly approved including `crates/cli/src/main.rs`. |
| **Keep explicit `numpy` (not `safetensors[torch]`) in the dep list** | Transparency for a debugging reader over idiomatic-but-implicit dependency resolution. |
| **Scope the doc walkthrough to tdt-600m; give 110m a full standalone copy-paste block** | Least churn, no fictitious commands, and clean copy-paste beats "swap these out" substitution instructions. |
| **Cross-surface references must point at content, never ordinals** | The doc (Steps 1–3) and CLI (Steps 1–5) number themselves independently; "matches Step 2" was a lie the moment it was quoted across surfaces. |

## The CMake Investigation (root cause)

Two **mechanically unrelated** errors had been conflated in the old doc:

1. **`install(EXPORT "AxiomTargets")` export-set error** — from parakeet.cpp's CMake. Fixed by `-DAXIOM_INSTALL=OFF -DPARAKEET_INSTALL=OFF`. **Version-independent** — reproduced as failing on both CMake 4.3.2 and 4.3.3 without the flags, passing with them.
2. **Highway atomics probe** (`Neither lock free instructions nor -latomic found`) — from `FindAtomics.cmake` (pins `CMAKE_CXX_STANDARD 11`, cites CMake issue 24063). **Environment-sensitive**, NOT version-categorical. Failed in May's environment; a second analyst's clean reproduction on CMake **4.3.2 AND 4.3.3** both printed `ATOMICS_LOCK_FREE_INSTRUCTIONS - Success`.

The trust breach: I initially wrote "CMake 4.x is fine" and proposed deleting the May-tested 3.31.x downgrade path, generalizing from a single run on my cmake 4.3.3. A second analyst's independent download of CMake 4.3.2 disproved both "4.x is broken" (old doc) and "4.3.3 fixed it" (my overreach) — the version was never the variable; the flags were. The doc now reflects this precisely.

## The numpy Dogfood (root cause)

A clean-room install of the tdt-ctc-110m model failed at `convert_nemo.py`'s final step with `ModuleNotFoundError: No module named 'numpy'`. Verified mechanism from the venv's own package metadata:

- `safetensors.torch.save_file()` needs numpy, but `safetensors` declares it only as an **optional extra** (`safetensors[numpy]` / `safetensors[torch]`). A bare `pip install safetensors` pulls no numpy.
- Modern PyTorch (**verified torch 2.12.0**) no longer declares numpy as a hard dependency (no `Requires-Dist: numpy`). Neither does torchaudio.
- Therefore `pip install safetensors torch torchaudio huggingface_hub` installs **zero numpy**, and conversion dies at save time.
- The maintainer's upstream `docs/PARAKEET.md:300` has the **same latent gap** — it only ever worked because numpy was already present (older torch supplied it transitively, or the May venv listed it explicitly). We didn't add a phantom requirement; we were the first to run the recipe somewhere numpy genuinely wasn't.
- numpy 2.x is fine (2.4.6 tested against torch 2.12 — the "numpy<2" note in torch's README is legacy).

This is the textbook "a transitive dep that came free for years silently stopped being free after an upstream packaging change" failure — invisible until a from-scratch install.

## Changes Made

| Change | Detail |
|--------|--------|
| **CMake prereq bullet** | `docs/PARAKEET.md` — reassurance-first: "Any recent CMake works"; flags handle the export-set gotcha; 3.31.x is the atomics fallback; verified on 3.31.x/4.3.2/4.3.3 |
| **Atomics troubleshooting** | Rewrote the false "incompatible with CMake 4.x / conflicts with C++20" section → environment-sensitive, with a concrete `FindAtomics.cmake` line-34 patch + 3.31.x option |
| **Export-set troubleshooting** | Retitled "CMake 4.x" → "modern CMake" (4.3.2 rejects it too) |
| **Kitware 3.31.12 install step** | Added optional step 5 to Prerequisites › macOS (URL re-verified `302→200`, ~80 MB) |
| **Install Models cwd fix** | `cd ~/src/parakeet.cpp` before downloading so all relative paths resolve in one dir; added specific `rm parakeet-tdt-0.6b-v3.nemo` reclaim |
| **`numpy` added to dep list** | Both 600m + 110m `pip install` lines in `docs/PARAKEET.md` AND the CLI recipe |
| **110m compact-model block** | Full standalone copy-paste block; fixed underscore/hyphen `.nemo` filename bug (HF file is `parakeet-tdt_ctc-110m.nemo`) |
| **Build-section clone dir** | `## Build parakeet.cpp` now clones into `~/src` to match the rest of the guide |
| **CLI printed recipe sync** | `crates/cli/src/main.rs` `cmd_setup_parakeet` — added `--recursive`, BSD-safe tokenizer extraction, install-disable cmake flags, generator-agnostic copy, pip deps (incl. numpy), and a pointer to PARAKEET.md as authoritative |
| **CLI "Install directory" line** | User edit: `Install directory created for {model}:` (accurate — `create_dir_all` runs earlier) |
| **Trailing-whitespace + ordinal cleanup** | Stripped trailing spaces; removed doc↔CLI ordinal cross-references in favor of content references |
| **Memory updates** | Corrected gotcha #8 (numpy is a hard requirement, with mechanism); added #10 (110m underscore filename) and #11 (CLI eprintln is a 2nd sync surface + rebuild requirement); index hook updated to "11 gotchas" |

## Testing / Validation Performed

- **Rust**: `cargo check -p minutes-cli`, `cargo fmt -- --check`, `cargo clippy -- -D warnings`, 30 CLI tests — all green after each round of CLI edits.
- **CMake forensics**: second analyst downloaded independent CMake 4.3.2, reproduced configure on the same parakeet.cpp source; both 4.3.2 and 4.3.3 pass the atomics probe and fail the export-set without flags.
- **HF filename verification**: `huggingface.co/api/models/...` confirmed `parakeet-tdt_ctc-110m.nemo` (underscore) and `parakeet-tdt-0.6b-v3.nemo`.
- **Kitware URL**: re-verified `302 → 200`, `content-length: 79954716`.
- **Full dogfood (the headline)**: fresh `uv venv` → `pip install` → `minutes setup --parakeet --parakeet-model tdt-ctc-110m` → `hf download` → `convert_nemo.py` (after numpy fix: `Unmapped: 0`, saved 437.4 MB / 114.6M params) → tokenizer extract → `minutes process demo.wav` → **30 words, warm sidecar, GPU, model loaded successfully**. The corrected doc path works end-to-end on a clean machine.

## Summary Statistics

- **3 files changed** (deliverables): `docs/PARAKEET.md` (≈ +140/−70), `crates/cli/src/main.rs` (+28), `README.md` (+8) — ~173 insertions / ~70 deletions vs `main`.
- **3 distinct bugs caught by review/dogfood**: missing `numpy`, 110m `.nemo` filename underscore/hyphen mismatch, stale CLI recipe (root cause: 6-day-old binary).
- **5 review findings** addressed in one round (global-sweep discipline, ordinal trap, compact-model scoping, "matches" overclaim, `rm` footgun).
- **3 memory gotchas** added/corrected.

## Discoveries / Handoff Notes (gotchas worth not re-discovering)

1. **`numpy` is a hard requirement for `.nemo` conversion**, not transitive on modern torch. See the numpy root-cause section. Both surfaces now name it.
2. **The 110m HF filename uses an underscore**: `parakeet-tdt_ctc-110m.nemo` (repo `nvidia/parakeet-tdt_ctc-110m`, convert flag `--model 110m-tdt-ctc`). Our *local* dir/vocab use hyphenated `tdt-ctc-110m` — two conventions coexist on one command line. Easy to mistype.
3. **`minutes setup --parakeet` prints its own recipe** (`cmd_setup_parakeet` `eprintln!` block). It's a second instruction surface. Editing the Rust source changes nothing until rebuild+reinstall: `cargo build --release -p minutes-cli --features parakeet && cp target/release/minutes ~/.local/bin/minutes`. A stale `~/.local/bin/minutes` will keep printing the old recipe (this bit us — a Jun-4 binary printed the pre-fix commands).
4. **The CLI recipe stays model-generic (`*.nemo` globs) and points to PARAKEET.md as authoritative** — by design it won't be byte-identical to the doc; consistency is on substance, not form. The glob style also sidesteps the exact filename trap that bit the doc.
5. **CMake "atomics" vs "export-set" are different errors.** Only the export-set is fixed by the flags; atomics is environment-sensitive and rare. Don't tell users to downgrade CMake for the export-set error.
6. **Process lesson (the one that cost us today): READ MEMORIES AT RECALL TIME, NOT JUST SAVE TIME.** Gotcha #8 in `project_parakeet_install.md` already named `numpy` from the May install. The index hook ("safetensors missing packaging dep") was in context, but the full memory file was never opened at the *start* of install work — only at the end, to write to it. Had it been read when Parakeet install work began, the numpy gap would have been a 30-second fix instead of a dogfood-blocking surprise. **When starting work on a topic with an existing memory file, open the full file before acting.**

## Current State

- **Branch**: `docs/parakeet-install-rewrite` (PR #250 head).
- **Uncommitted deliverables** (not yet committed — user runs all git): `docs/PARAKEET.md`, `crates/cli/src/main.rs`, `README.md`.
- **Untracked scratch files (DO NOT COMMIT)**: `docs/PARAKEET_v{Dev,PR,Upstream}_*.md`, `docs/replay-4f4e41e0-{clean,full,super-full}.md`. Decide whether to gitignore or delete.
- **User's local config** currently points at `tdt-ctc-110m` (from the dogfood) — may want to flip back to `tdt-600m`.
- **Installed CLI** `~/.local/bin/minutes` is the Jun-4 binary — **not yet rebuilt** with the synced recipe + numpy line.
- **Both Parakeet models now installed**: `tdt-600m` (from May) and `tdt-ctc-110m` (this session, validated).

## Unfinished Work

1. **Finding #1 — the Fastest Path is still non-functional end-to-end.** `docs/PARAKEET.md:121` runs only `minutes setup --parakeet` then jumps to the config block, with no model download/convert in between, so a reader's config points at nonexistent files. Decision pending: **inline** the real fetch (self-contained, third copy of the convert recipe) vs **gate** to Install Models (DRY, requires a section jump). The dogfood just produced a battle-tested command sequence that makes the inline option trustworthy; recommendation leans inline. This is the last correctness gap in the doc.
2. **Rebuild + reinstall the CLI** so the installed binary stops printing the stale recipe: `cargo build --release -p minutes-cli --features parakeet && cp target/release/minutes ~/.local/bin/minutes`.
3. **Commit / push / PR body.** Suggested commit message drafted earlier (docs+CLI sync, ends with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`). Then `git push --force-with-lease origin docs/parakeet-install-rewrite`. Stage only the 3 deliverables, not the scratch files.
4. **PR #250 body needs updating**: (a) reflect docs+code scope; (b) fix changelog items #8/#9 which still claim torchaudio was dropped and `hf download` was replaced with `curl` — the shipped doc keeps `torchaudio`/`hf`; (c) add the numpy finding + dep-list rationale; (d) PR title still says "9 gotchas" — now 11+.
5. **Maintainer heads-up** about the expanded scope (PR now touches `main.rs`) before marking ready-for-review. Maintainer (@silverstein) already reviewed the docs-only version and said he'll merge on ready.
6. **Optional follow-up (separate issue)**: bundle the model install as a script (`scripts/install-parakeet-model.sh <model>`) or extend `minutes setup --parakeet --convert` so it's not 6 manual steps. Out of scope for this PR; the blocker is the Python toolchain (torch/safetensors/numpy + convert_nemo.py) the Rust binary can't bundle.

## Issues & PRs

- **PR #250** — `docs: rewrite PARAKEET.md install guide` — OPEN/draft, branch `docs/parakeet-install-rewrite`. Maintainer reviewed the docs-only version in depth and is ready to merge on "ready for review." Scope has since expanded to docs+code (CLI recipe sync).
