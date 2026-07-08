---
date: 2026-06-26
time: "June 25, 2026 12:49 AM PDT - June 26, 2026 3:04 PM PDT"
agent: Codex
session id: 019efdb9-34f3-7e52-862f-86f52a0b7dcd
resumed: "June 26, 2026 approximately 3:02 PM PDT"
project: minutes
branch: dev
---

# Session Summary: MLX Native ASR Research

## Overview

Evaluated `robertelee78/mlx-native` as a possible Rust/Metal foundation for
Apple Silicon ASR acceleration, with particular attention to Parakeet and the
existing Minutes transcription architecture. The findings were captured in a
compact design research reference with implementation-oriented next steps.

## Key Decisions Made

- Treat `mlx-native` as a respectable low-level Metal kernel toolkit and a
  research reference, not as a production dependency or drop-in Parakeet
  backend.
- Prioritize warm Parakeet helper/server reuse, transcript parity tests,
  fallback behavior, and per-backend timing before considering a native
  Rust/Metal ASR runtime.
- If native Metal work is explored later, start with one measured bottleneck
  operation and require numerical parity plus end-to-end benchmark evidence.
- Avoid a full Parakeet port as an initial spike because `mlx-native` does not
  provide an ASR model runtime, model zoo, high-level tensor API, feature
  extraction, or decoder integration.

## Changes Made

| Change | Detail |
|--------|--------|
| **MLX Native research reference** | Created [`docs/designs/mlx-native-asr-research-2026-06-25.md`](designs/mlx-native-asr-research-2026-06-25.md) with YAML frontmatter, repository assessment, fit analysis, recommendations, and source links. |
| **Session handoff** | Created this summary at [`docs/session-summary-2026-06-26-mlx-native-asr-research.md`](session-summary-2026-06-26-mlx-native-asr-research.md). |

No production code was edited. Other modified and untracked files already in
the working tree were not changed during this research session.

## Research Performed

- Confirmed the upstream Git repository was reachable and inspected its tag
  history through `v0.9.3`.
- Made a shallow research clone at `/private/tmp/mlx-native-review` and reviewed
  its public positioning, crate metadata, build path, exported API, file
  layout, benchmark inventory, test inventory, and Metal kernel inventory.
- Searched for ASR-specific capabilities including Parakeet, CTC, TDT, RNNT,
  Conformer, mel-spectrogram processing, and decoder/model integration. None
  were found as a ready-to-use runtime layer.
- Compared the upstream implementation against Minutes' current Parakeet
  helper boundary and prior performance findings.
- Consulted the published crate documentation and official MLX documentation
  linked from the research reference.
- Verified the final research document contents and frontmatter. No code tests
  or benchmarks were run because the session produced documentation only.

## Files Reviewed

Local project files reviewed:

- [`.agents/skills/rust-router/SKILL.md`](../.agents/skills/rust-router/SKILL.md)
- [`crates/core/src/parakeet.rs`](../crates/core/src/parakeet.rs)
- [`docs/designs/parakeet-helper-contract.md`](designs/parakeet-helper-contract.md)
- [`docs/designs/parakeet-perf-2026-04-14.md`](designs/parakeet-perf-2026-04-14.md)
- [`docs/session-summary-2026-04-06-rebuild-and-mlx-research.md`](session-summary-2026-04-06-rebuild-and-mlx-research.md)

Upstream files reviewed in the temporary clone:

- `/private/tmp/mlx-native-review/README.md`
- `/private/tmp/mlx-native-review/Cargo.toml`
- `/private/tmp/mlx-native-review/build.rs`
- `/private/tmp/mlx-native-review/src/lib.rs`
- `/private/tmp/mlx-native-review/src/`, `tests/`, `benches/`, and Metal kernel
  file inventories

External references reviewed:

- <https://github.com/robertelee78/mlx-native>
- <https://docs.rs/mlx-native/latest/mlx_native/>
- <https://ml-explore.github.io/mlx/build/html/index.html>

## Summary Statistics

- 2 documentation files created, including this summary.
- 113 lines added in the primary research reference before this summary.
- 5 local project files reviewed for architecture and historical context.
- 4 key upstream files reviewed directly, plus source, test, benchmark, and
  kernel inventories.
- 3 external reference locations analyzed.
- 1 candidate backend assessed.
- 0 production files modified, 0 bugs fixed, and 0 code tests run.

## Discoveries / Handoff Notes

`mlx-native` exposes serious low-level building blocks such as device and
buffer management, kernel registration, graph execution, command encoding,
safetensors/GGUF loading, tests, benchmarks, and precompiled Metal libraries.
Its current scope is nevertheless oriented toward low-level transformer, LLM,
and SSM inference. Integrating Parakeet would mean implementing and validating
substantial ASR runtime functionality rather than replacing an existing
dependency.

Minutes already has the more useful near-term architectural boundary: the
structured Parakeet helper contract. Prior measurements identified warm process
reuse as a larger structural opportunity, with roughly 10.7x realtime for the
subprocess path and roughly 12.6x for the warm fp32 server in the referenced
performance notes. The fp16 server path had crashed in prior work and should
not be treated as validated.

## Current State

- Branch: `dev`.
- The research clone remains at `/private/tmp/mlx-native-review` and is
  disposable.
- The two session documents are untracked at session end.
- The worktree contains unrelated pre-existing modified and untracked files;
  they were deliberately left untouched.

## Unfinished Work

- No implementation work was started for warm Parakeet process reuse,
  transcript parity tests, fallback hardening, or backend-specific timing.
- No isolated `mlx-native` kernel benchmark was attempted because no measured
  Parakeet bottleneck was identified in this session.
- Revisit a native Metal spike only when profiling identifies a material
  operation or an ASR-oriented runtime layer appears above `mlx-native`.
