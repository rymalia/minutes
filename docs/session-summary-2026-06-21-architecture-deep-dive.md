---
session_id: 17279b0b-265a-4b18-87fa-6661125e349f
date: 2026-06-21
time: "2026-06-20 11:08 PM PDT – 2026-06-21 2:52 PM PDT"
project: minutes
---

# Session Summary — Architecture Deep Dive (CLI vs Tauri, Parakeet, packaging)

## Overview

A `learn-codebase` deep dive into how Minutes is structured — with a specific focus on the
relationship between the `minutes` CLI and the Tauri desktop app — that progressively resolved the
user's mental model (linking, versioning, feature gating) and culminated in a committed architecture
reference (`docs/ARCHITECTURE.md`), two interactive HTML diagrams, and a local `CLAUDE.local.md`
override.

## Key Decisions Made

- **Front-load understanding via parallel survey agents + direct reads.** Given the scale (~67k LOC in
  core alone), dispatched five general-purpose agents to survey heavy subsystems (CLI, Tauri,
  pipeline, streaming, MCP) while reading the coordination primitives (`pid.rs`,
  `desktop_control.rs`) directly to build a first-hand cache of the most load-bearing code.
- **Adopt a strict grounding discipline.** Mid-session the user asked that every claim be verified
  against the real codebase, never "in theory." This immediately caught a confident error (see
  Discoveries) and shaped the rest of the session. Saved as a feedback memory.
- **`docs/ARCHITECTURE.md` as the canonical home.** No existing architecture doc existed; followed the
  repo's `UPPERCASE-HYPHENATED.md` convention. Made it self-contained by copying the two diagrams into
  `docs/diagrams/` and linking them relatively.
- **`CLAUDE.local.md` as a local override, kept truly local via `.git/info/exclude`.** The committed
  `CLAUDE.md` is treated as read-only; the local file layers on top. Used `.git/info/exclude` (per-clone)
  rather than editing the committed `.gitignore`, which only ignores `.claude/*.local.md`.

## Changes Made

| Change | Detail |
|--------|--------|
| **Architecture reference** | Created `docs/ARCHITECTURE.md` — 14 sections, grounded with `file:line` anchors, covering front-ends, coordination layer, pipeline, streaming, transcription/Parakeet, versioning, features |
| **Assessment frontmatter** | Added YAML frontmatter to `docs/ARCHITECTURE.md` (date, assessed_version 0.18.14, commit 8a45434, method, companion diagrams, line-drift caveat) |
| **Build→link→run diagram** | Created `docs/diagrams/minutes-build-link-run.html` (Mermaid + evidence tables; blueprint aesthetic) |
| **Parakeet fallback diagram** | Created `docs/diagrams/minutes-parakeet-fallback.html` (fallback chain + sidecar state machine; Dracula aesthetic) |
| **Local override** | Created `CLAUDE.local.md` (links ARCHITECTURE.md + diagrams, fast-facts cheat-sheet, grounding preference) |
| **Local ignore** | Appended `CLAUDE.local.md` to `.git/info/exclude` so it never gets committed |
| **Persistent memory** | Added 3 memory files: `project_three_frontends_coordination`, `project_features_are_per_binary`, `feedback_ground_in_real_codebase` (+ index entries) |

## Research Performed

- **Subsystems surveyed** (via 5 parallel agents + direct reads): CLI `main.rs` (~9.3k LOC),
  Tauri `main.rs` + `commands.rs` + `cli_setup.rs` + `pty.rs` (~26k LOC), core pipeline
  (`pipeline.rs`, `transcribe.rs`, `diarize.rs`, `summarize.rs`, `jobs.rs`, `markdown.rs`),
  streaming (`live_transcript.rs`, `streaming.rs`, `dictation.rs`, `events.rs`,
  `transcription_coordinator.rs`), and the MCP server + SDK (`index.ts`, `reader.ts`).
- **Coordination primitives read first-hand:** `pid.rs`, `desktop_control.rs`.
- **Parakeet chain verified line-by-line:** `transcribe.rs` dispatch + fallback (lines 325–728,
  1802–2059, 2462), `parakeet_sidecar.rs` (state machine, `start_once`, socket protocol, FP16
  downgrade, `sidecar_enabled_effective`).
- **Empirical verification on the machine:** `which minutes`, byte sizes, `--version` /
  `capabilities --json` on both CLI binaries, `file` on the bundle stub, `nm` symbol counts, `.rlib`
  artifacts, version declarations across all crates + `tauri.conf.json` + manifests.

## Discoveries / Handoff Notes

- **The Tauri app does NOT call the CLI for work.** CLI and app both statically link `minutes-core`
  and run in-process; they coordinate only through `~/.minutes/` files. The MCP server is the
  exception — it shells out to the CLI.
- **Compile-time features are per-binary.** `parakeet` in the CLI does not enable it in the app; the
  app needs `TAURI_FEATURES="parakeet"`. Verified via the `#[cfg(feature="parakeet")]` gate at
  `transcribe.rs:673/723`.
- **Grounding caught a real error:** the 52-byte `…/Minutes.app/Contents/MacOS/minutes` is a
  **placeholder shell script** (`echo 'minutes CLI placeholder'; exit 1`), not a bundled CLI — earlier
  described incorrectly as "a pointer to the sidecar."
- **`nm` shows 0 `minutes_core` symbols** in release binaries because `[profile.release] strip = true`,
  not because core isn't embedded — binary sizes (32 MB CLI / 47 MB app) are the real proof.
- **Versioning is workspace-level** (0.18.14); core/CLI inherit it, the app's real version is in
  `tauri.conf.json` (the Cargo `0.1.0` is vestigial), and `whisper-guard` (0.3.0) is the lone crate on
  an independent cadence. Within one checkout cli/app can't diverge; across install moments they can
  (observed: two CLIs at 0.18.6 and 0.18.5).
- **"Sidecar" is overloaded** in the repo: the Parakeet `example-server` process, companion files
  (`live-transcript-status.json`), and the recording-sidecar live mode — three unrelated uses.

## Current State

- **Branch:** `main`. **Nothing committed** (per the repo's git restriction — suggest messages, user commits).
- **Untracked/new in repo:** `docs/ARCHITECTURE.md`, `docs/diagrams/minutes-build-link-run.html`,
  `docs/diagrams/minutes-parakeet-fallback.html`, and the prior
  `docs/session-summary-2026-06-20-...md` + this summary. These are committable.
- **Local-only (git-excluded):** `CLAUDE.local.md`.
- **Diagrams also at:** `~/.agent/diagrams/` (originals; repo copies are the canonical ones).

## Summary Statistics

- ~30+ source files read or surveyed; 5 parallel survey agents dispatched.
- 4 new repo artifacts (1 markdown reference + 2 HTML diagrams + 1 session summary) and 1 local override.
- 3 persistent memory files added.
- 0 code changes to Rust/TS sources — research + documentation session.

## Unfinished Work

- **Commit the shareable artifacts** (`docs/ARCHITECTURE.md` + `docs/diagrams/*.html`). A suggested
  commit message was provided in-session; the user performs commits.
- **Optional:** link `docs/ARCHITECTURE.md` from the committed `CLAUDE.md`/`README.md` for
  discoverability (deferred — `CLAUDE.md` is treated as read-only; the link currently lives in
  `CLAUDE.local.md`).
- A few sub-line references inside the Parakeet helper fall-through block (e.g. `log_*_once`) are
  approximate to the ~1966–2020 region rather than pinned to exact lines.
