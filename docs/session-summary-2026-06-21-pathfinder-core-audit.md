---
session_id: 019eebfd-cc60-7421-a242-e117467ec075 (codex)
date: 2026-06-21
time: "approx. 2:15 PM PDT – 3:00 PM PDT"
project: minutes
---

## Overview

Completed a source-verified `$claude-mem:pathfinder` architecture audit synthesis for Minutes, using the prior Pathfinder artifacts as scaffolding but re-checking the key claims against the current codebase. The main outcome was a final audit document plus synchronized phase artifacts clarifying that Minutes has three product surfaces over one Rust engine: CLI and Tauri link `minutes-core` directly, while MCP bridges to core behavior through the CLI and TypeScript read-only fallbacks.

## Key Decisions Made

- **Treat prior Pathfinder output as draft evidence, not authority.** The handoff said the previous run was effectively complete but context-limited, so this session re-verified the highest-risk claims instead of merely summarizing existing files.
- **Add a final synthesis artifact rather than rewrite all phase outputs.** This preserved the audit trail in `00`-`04` while creating one authoritative, source-backed landing document at `05-final-synthesized-audit.md`.
- **Correct the mental model around MCP.** MCP is not a third static `minutes-core` consumer. It is a Node MCP server that shells out to the `minutes` CLI for authoritative behavior and keeps a TypeScript reader fallback for some read-only markdown flows.
- **Preserve legitimate specialization.** Desktop-native call capture, desktop-control delegation, Recall PTY/workspace behavior, foreground `minutes process`, and separate search/graph/knowledge stores were explicitly marked as things not to collapse into generic abstractions.
- **Prioritize lifecycle policy drift over broad abstraction.** The recommended refactor order starts with activity policy and stop semantics, then artifact scanning/projection, before touching broader launch planning.

## Changes Made

| Change | Detail |
|--------|--------|
| **Final Pathfinder synthesis** | Added `PATHFINDER-2026-06-21/05-final-synthesized-audit.md` with the source-verified architecture assessment, runtime diagram, ranked unification targets, non-unification boundaries, and recommended refactor order. |
| **Synced phase artifacts** | Updated `02-duplication-report.md`, `03-unified-proposal.md`, and `04-handoff-prompts.md` so they stand alone with the final synthesis corrections: MCP-as-CLI-bridge, start-only desktop-control, graph/search exclusion drift, desktop update readiness, and CLI-backed stop semantics. |
| **Verified prior handoff** | Read `/private/tmp/minutes-pathfinder-handoff-2026-06-21.md` and confirmed the existing Pathfinder artifact set under `PATHFINDER-2026-06-21/`. |
| **Subagent verification** | Spawned four explorer subagents to independently verify core linkage/process boundaries, recording/stop coordination, processing/search/graph/knowledge flows, and desktop/MCP surfaces. |
| **Metadata review** | Checked git branch/status and existing session-summary style before writing this end-of-session document. |

## Research Performed

- **Artifact review.** Read the prior Pathfinder handoff and existing `PATHFINDER-2026-06-21` outputs: `00-features.md`, all six `01-flowcharts/*.md`, `02-duplication-report.md`, `03-unified-proposal.md`, and `04-handoff-prompts.md`.
- **Core linkage verification.** Confirmed via manifests and entry points that `crates/cli` and `tauri/src-tauri` depend on `minutes-core`, while `crates/mcp` is a Node package depending on MCP SDK and `minutes-sdk`, not Rust core bindings.
- **Recording and stop verification.** Audited CLI, core capture, Tauri commands, desktop-control, MCP start/stop, native call capture, and shared sentinel/PID behavior.
- **Processing/retrieval verification.** Audited durable job processing, watcher direct-pipeline behavior, terminal job/archive/status behavior, graph rebuild calls, search-index sync, direct research/intents scans, and knowledge ingest.
- **Desktop/MCP surface verification.** Audited Tauri command RPC, palette dispatch, shortcut manager migration residue, update gating, Recall PTY/workspace behavior, desktop-control delegation, and MCP response shaping.

## Summary Statistics

- 1 new final synthesis artifact added under `PATHFINDER-2026-06-21/`.
- 3 existing Pathfinder phase artifacts updated to match the final assessment.
- 1 new session summary added under `docs/` and then updated after artifact sync.
- 4 verification subagents used.
- 6 existing feature flowcharts reviewed.
- 8 unification/refactor targets ranked after adding desktop update readiness.
- 5 explicit "do not unify" specialization boundaries documented.
- 0 implementation code files changed.
- 0 tests run; this was architecture/research documentation work.

## Discoveries / Handoff Notes

- **Corrected core mental model:** CLI and Tauri each embed/link `minutes-core` as Rust binaries. MCP does not; it calls the CLI via `execFile`/`spawn` and uses TypeScript readers for some read-only fallback behavior.
- **Desktop-control is start-only today:** MCP `start_recording` can delegate through filesystem request/response files to the running desktop app, but stop still goes through `minutes stop` and shared sentinel/PID semantics.
- **Watcher processing is behaviorally separate from queued processing:** watcher discovery and file settling are legitimate specialization, but watcher processing bypasses job JSON, `processing-status.json`, terminal job archive state, and QMD refresh.
- **Graph/search drift risk:** graph rebuild appears to walk markdown separately from the search-index exclusion predicate, so graph and search can disagree if excluded markdown directories live under `config.output_dir`.
- **Desktop update gating has repeated active-session predicates:** update check, surfacing, and install paths each re-evaluate active recording/live/dictation state.

## Current State

- Branch: `main`; omitted from frontmatter because there was no meaningful branch context beyond the default branch.
- Working tree has existing untracked files unrelated to this specific summary, including `AGENTS.override.md`, architecture docs/diagrams, replay docs, and the untracked `PATHFINDER-2026-06-21/` directory.
- `PATHFINDER-2026-06-21/.DS_Store` is still present and untracked; it was not removed.
- Session metadata available from environment: `CODEX_THREAD_ID=019eebfd-cc60-7421-a242-e117467ec075`, `CODEX_CI=1`, `CODEX_SANDBOX=seatbelt`, `CODEX_SANDBOX_NETWORK_DISABLED=1`.
- Model/context telemetry was not exposed through the environment or goal tool. Model is known from system context as Codex based on GPT-5; exact reasoning level and context-window usage were not available.
- Exact session start time was not exposed. The frontmatter time range uses an approximate start and the observed current time of `3:00 PM PDT`.

## Unfinished Work

- Use the refined handoff prompts to run `/make-plan` for the first recommended slice: core `ActivityPolicy`.
- Clean up the unrelated `.DS_Store` in `PATHFINDER-2026-06-21/` if desired.
- No commit was made.
