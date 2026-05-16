---
date: 2026-04-06
time: "10:08 AM PDT – 11:03 AM PDT"
project: minutes
---

## Overview

Refresher session on rebuilding Minutes from source (CLI + Tauri desktop app + MCP server), followed by research into whether MLX could replace ONNX Runtime for performance gains. Resolved a Xcode clang version mismatch build error along the way.

## Key Decisions Made

- **MLX not worth pursuing**: After researching ONNX vs MLX and auditing where ONNX is used in the codebase, concluded that switching to MLX for diarization inference would provide marginal performance gains (small models, lightweight stage) while incurring high costs (no Rust MLX bindings, cross-platform breakage, model conversion, pyannote-rs fork). The transcription bottleneck (whisper.cpp) already uses Metal directly.
- **`cargo clean` for Xcode updates**: Established that stale build caches from Xcode version changes (clang 17 → 21) require `cargo clean` before rebuilding the Tauri app. The CLI build via `cargo install` is unaffected since it uses a separate build directory.

## Changes Made

| Change | Detail |
|--------|--------|
| **No code changes** | This was a research/build session — no source modifications |

## Research Performed

- Audited ONNX usage across the codebase: confirmed it's isolated to `crates/core/src/diarize.rs` via `pyannote-rs` + `ort` crate, running two small models (~34MB total)
- Verified whisper.cpp transcription uses GGML format with native Metal — completely separate from the ONNX stack
- Analyzed MLX vs ONNX trade-offs specific to Minutes' architecture: model sizes, Rust binding availability, cross-platform implications, pipeline bottleneck location
- Diagnosed and resolved Xcode/clang linker error (`library 'clang_rt.osx' not found`) — confirmed clang version jumped from 17 to 21, cached build artifacts had stale paths
- Reviewed TCC (Transparency, Consent, and Control) dual-identity app pattern for macOS permission-sensitive development

## Discoveries / Handoff Notes

- **Xcode clang version on this machine**: 21.0.0 (Apple clang 21.0.0, `clang-2100.0.123.102`). The project's whisper-rs-sys build script caches the clang runtime library path, so any future Xcode update that changes the clang version will require another `cargo clean`.
- **ONNX Runtime version**: `ort` v2.0.0-rc.10 with `ndarray` feature. Used only for diarization.
- **Diarization has custom workarounds**: Minutes bypasses `pyannote-rs`'s `get_segments` (f32 normalization bug) and `EmbeddingManager` (only stores first embedding per speaker). These workarounds in `diarize.rs` would need to be ported to any alternative inference backend.
- **User created `docs/guide-rebuilding-minutes-from-source.md`** as a personal reference guide for future rebuilds.

## Summary Statistics

- 0 files modified (research/build session)
- 3 source files audited in depth (`diarize.rs`, `Cargo.toml` workspace, `crates/core/Cargo.toml`)
- 1 build error diagnosed and resolved (Xcode clang path mismatch)
- 1 ML framework evaluated and ruled out (MLX)

## Unfinished Work

- The user's personal rebuild guide (`docs/guide-rebuilding-minutes-from-source.md`) could be updated with the `cargo clean` gotcha for Xcode updates — this was suggested but not confirmed as added.
