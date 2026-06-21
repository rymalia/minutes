# Session replay: `17279b0b-265a-4b18-87fa-6661125e349f`

- **main**: `/Users/rymalia/.claude/projects/-Users-rymalia-projects-minutes/17279b0b-265a-4b18-87fa-6661125e349f.jsonl`
- **subagents**: 8 file(s) in `/Users/rymalia/.claude/projects/-Users-rymalia-projects-minutes/17279b0b-265a-4b18-87fa-6661125e349f/subagents/`
- **cwd**: `/Users/rymalia/projects/minutes`
- **turns**: 24
- **filters**: tools=off, tool_results=off, thinking=off, sidechains=off, history=off

---

### user · 2026-06-21 06:09:28

_(invoked /claude-mem:learn-codebase)_

### assistant · 2026-06-21 06:09:45

I'll learn this codebase with a focus on the Tauri desktop app ↔ CLI relationship. Let me start by mapping the structure, then read the critical files directly while dispatching parallel agents to survey the broader codebase.

### assistant · 2026-06-21 06:10:03

This is a large codebase (~67K lines in core, ~11K CLI, ~26K Tauri, plus TypeScript MCP/SDK). I'll be thorough but focused on your stated goal — the CLI ↔ Tauri ↔ shared-core relationship. Let me read the central coordination files directly while dispatching parallel agents to survey the broader subsystems.

### assistant · 2026-06-21 06:10:29

I have the dependency picture: `minutes-core` is the shared engine (feature-gated), and both `minutes-cli` and `minutes-app` (Tauri) link it. The CLI also pulls in `which`/pty/shell plugins, hinting it sometimes shells out to the `minutes` binary. Let me dispatch parallel agents to survey the heavy subsystems while I read the coordination primitives directly.

### assistant · 2026-06-21 06:13:40

Two dense reports confirm the core thesis: **CLI and Tauri are peer front-ends over the same `minutes-core`, coordinating through shared on-disk state — not by one spawning the other.** Let me solidify this by reading the coordination primitives myself, and dispatch agents for the engine internals and the MCP/SDK third consumer.

### assistant · 2026-06-21 06:13:49

The coordination layer is now crystal clear. `desktop_control.rs` is file-based IPC: a heartbeat status file with a 10s freshness window (`desktop_app_owns_pid`) plus an atomic claim-via-rename request/response queue. `pid.rs` enumerates all the shared `~/.minutes/` state files. Let me dispatch agents for the remaining subsystems to round out breadth.

### assistant · 2026-06-21 06:32:39

I now have a complete, deep picture across all subsystems. Let me record the key architectural insight to persistent memory, then synthesize for you.

### assistant · 2026-06-21 06:33:41

I've now read the coordination primitives directly and surveyed every major subsystem via parallel agents. Here's the synthesis, focused on your question.

# How Minutes works — and how the CLI and Tauri app relate

## The one-sentence model

**There are three front-ends — the `minutes` CLI, the Tauri desktop app, and the MCP server — sitting on top of one shared Rust engine (`minutes-core`). The CLI and Tauri app both statically link `minutes-core` and call it directly in-process. They are *peers*, not layers: neither shells out to the other. They coordinate entirely through shared files under `~/.minutes/`.**

```
        ┌─────────────┐   ┌──────────────┐   ┌─────────────────────┐
        │ minutes CLI │   │  Tauri app   │   │   MCP server (TS)   │
        │ (clap, 55   │   │ (menu bar,   │   │  npx minutes-mcp    │
        │  commands)  │   │  103 cmds)   │   │  31 tools/7 res     │
        └──────┬──────┘   └──────┬───────┘   └──────────┬──────────┘
               │ links            │ links               │ shells out via
               │ directly         │ directly            │ execFile("minutes …")
               ▼                  ▼                      │ + reads markdown via
        ┌─────────────────────────────────┐             │ minutes-sdk (TS reader)
        │      minutes-core (Rust lib)     │◀────────────┘
        │  capture·transcribe·diarize·     │
        │  summarize·pipeline·jobs·pid·    │
        │  events·live_transcript·…        │
        └─────────────────────────────────┘
               │ all durable state + all coordination
               ▼
        ~/.minutes/  (PID files+flock, events.jsonl, jobs/, desktop-control/,
                      config.toml, voices.db, overlays.db, live-transcript.jsonl)
        ~/meetings/  (the markdown corpus — the canonical product output)
```

## The CLI and Tauri app: same engine, different shells

| Dimension | CLI (`minutes-cli`) | Tauri app (`minutes-app`) |
|-----------|--------------------|-----------------|
| **How it uses core** | `clap` dispatcher; each subcommand calls `minutes_core::*` | `#[tauri::command]` fns (`cmd_*`) call the *same* `minutes_core::*` |
| **Relationship to the other** | Detects app-owned recordings; can stop them via sentinel | Reflects CLI-started recordings in its tray (PID-aware); can stop a CLI `minutes live` via SIGTERM+sentinel |
| **Feature flags** | `whisper`+`diarize` default; `streaming` always | `streaming`+`diarize` always |
| **Extra deps** | self-spawns for `process-queue` & parakeet-helper | tray, PTY, updater, autostart, global-shortcut, window-state |
| **Spawns subprocesses?** | itself (queue worker / parakeet helper) | *agent* CLIs (claude/codex) in a PTY for the Recall assistant — **never spawns `minutes`** |

The one place the app touches the CLI binary: `cli_setup.rs` symlinks `~/.local/bin/minutes` → the `minutes` sidecar bundled inside the `.app` (so app updates also update the CLI), plus a 1-second `minutes --version` probe. That `--version` call is the *only* time the app ever executes the CLI.

## The coordination layer (the heart of your question)

Everything cross-process lives in `~/.minutes/`, managed by three core modules:

**`pid.rs` — flock'd PID files + state sidecars.** `recording.pid`, `dictation.pid`, `live-transcript.pid` are each acquired under an `fs2` flock (atomic check-and-write, no TOCTOU). Both the CLI and app go through these, so each sees the other's sessions. Reads use `inspect_pid_file().is_active()` rather than reading the PID, so a Windows mandatory-locked file is still detected (#258). Companion files: `recording-meta.json` (the `CaptureMode`), `last-result.json` (recorder→`stop` handoff), `processing-status.json`, `current.wav`, `mic_mute` sentinel.

**`desktop_control.rs` — file-based IPC, reverse direction.** When a CLI command or MCP tool wants the *running app* to record (e.g. for system-audio capture), the app writes a `desktop-app.json` heartbeat; `desktop_app_owns_pid()` trusts it only if PID matches **and** it's <10s old. Requesters drop `requests/{id}.json`; the app's 2s poll claims it by **atomic rename** (single-claim guarantee) and writes `responses/{id}.json`. This is also why `minutes stop` checks `desktop_app_owns_pid()` — if the app owns the recorder it stops via sentinel only, never SIGTERM.

**`events.rs` — append-only JSONL event bus.** `events.jsonl` with a monotonic `seq` (backed by an `events.seq` sidecar + `events.lock` flock). `read_events_since_seq` is the stable cursor for agent reactivity. `agent.annotation` events let external agents annotate meetings without mutating markdown, gated by a `~/.minutes/agents.allow` allowlist.

## The processing pipeline (what all three front-ends ultimately drive)

```
WAV ─decode(ffmpeg→symphonia)→ 16kHz mono ─transcribe(whisper|parakeet)→
  ─whisper-guard cleanup→ transcript-only .md written ─┐
                                                        │ (crash-safe checkpoint)
  ─diarize(pyannote ONNX | energy stems)→ speaker_map ─┤
  ─summarize(agent CLI | Ollama | none)→ ──────────────┤
  ─extract action_items/decisions/intents→ ────────────┤
  ─attribute speakers L0–L3→ rewrite High-conf names ──┘
  → final markdown + YAML frontmatter (0600 perms) in ~/meetings/
```

**The crucial async/sync asymmetry:** `minutes record` does *not* run this pipeline — on stop it renames the WAV into `jobs/<id>.json` and returns instantly; a flock-guarded `process-queue` worker (a detached self-spawn, or the app's `--process-queue-worker`) drains the queue, each stage wrapped in `catch_unwind` so a whisper FFI panic becomes a `Failed` job, not a crash. By contrast `minutes process <file>` (offline) runs the pipeline **synchronously** in-process. Both the CLI and app share the same `jobs/` queue.

## The MCP server — the third, looser consumer

Unlike the other two, the MCP server is TypeScript and does *not* link Rust. It either shells out (`minutes search --json`, `minutes get`, `minutes capabilities`) or reads markdown directly via `minutes-sdk`'s `reader.ts` (a deliberate parity-mirror of the Rust `minutes-reader`, right down to `humanizeTranscript` only renaming `confidence: "high"` speakers). It feature-gates which tools it registers on `minutes capabilities --json` (rejecting `api_version > 1`), and for recording it *delegates to the app via the desktop-control file IPC* when running inside Claude Desktop's `.mcpb` extension or for `call` intent — otherwise it `spawn`s `minutes record` **non-detached** (a detached `setsid()` would create a new macOS audit session and sever the inherited TCC mic grant → silent recordings).

## What I cached

I read `lib.rs`, all three Cargo manifests, and the coordination primitives (`pid.rs`, `desktop_control.rs`) directly, and surveyed CLI `main.rs`, Tauri `main.rs`+`commands.rs`+`cli_setup.rs`, the full processing engine (`pipeline`/`transcribe`/`diarize`/`summarize`/`jobs`/`markdown`), the streaming subsystem (`live_transcript`/`streaming`/`dictation`/`events`/`transcription_coordinator`), and the MCP/SDK layer. I saved the cross-front-end coordination model to persistent memory as `project_three_frontends_coordination.md`.

Want me to go a level deeper on any one area — e.g. the speaker-attribution L0–L3 confidence ladder, the parakeet sidecar/subprocess fallback chain, the Tauri tray/shortcut state machine, or the live-coaching assistant workspace?

### user · 2026-06-21 06:46:32

Let's go deeper into the parakeet sidecar/subprocess fallback chain, and also specifically the parakeet install process (the instructions in `docs/PARAKEET.md` almost entirely focus on the CLI, but then in the "Building Minutes with Parakeet Support" section, line 525, there is a reference to rebuild the tauri desktop app:
```
# Tauri desktop app
TAURI_FEATURES="parakeet" cargo tauri build --bundles app
```

Does this mean that to enable parakeet features in the desktop app that it needs to be rebuilt with that feature flag set, or does the parakeet ability exist in the tauri app by default once it is built into `minutes` cli?

I clearly still don't fully understand the tauri vs cli situation. Does the tauri app just call the cli binary for everything?

### assistant · 2026-06-21 06:46:41

Great question — this gets right at the misconception. Let me verify the answer against the actual code rather than reasoning from the docs. Let me read the parakeet fallback chain and the feature-flag wiring directly.

### assistant · 2026-06-21 06:47:06

The fallback chain is taking shape. Let me confirm the feature-flag gating (the crux of your question) and read the rest of the sidecar state machine and binary resolution.

### assistant · 2026-06-21 06:47:14

Confirmed the crux: `transcribe_parakeet_dispatch` (line 673) is `#[cfg(feature = "parakeet")]`-gated, and this code lives **inside `minutes-core`** — compiled into whichever binary links it. Let me grab the no-feature branch and the sidecar entry + binary/helper resolution to complete the chain.

### assistant · 2026-06-21 06:47:23

Definitive answer confirmed (lines 723–727): without the `parakeet` feature, `minutes-core` returns `EngineNotAvailable("parakeet")` — and this code is compiled into each binary independently. Let me grab the sidecar's public entry points and binary/helper resolution to finish the fallback chain.

### assistant · 2026-06-21 06:48:56

I now have the complete picture, verified in code. Let me answer directly.

## Short answer

**Yes — to get Parakeet in the desktop app, the desktop app itself must be compiled with `TAURI_FEATURES="parakeet"`.** Having Parakeet in the `minutes` CLI does *not* give the Tauri app Parakeet. That `cargo tauri build` line at PARAKEET.md:525 is necessary, not redundant.

And the bigger question — **no, the Tauri app does not call the CLI binary for its work.** It links `minutes-core` and runs transcription *in-process*, exactly like the CLI does. They're two separate compilations of the same engine.

## Why — the mental model

`parakeet` is a **compile-time Cargo feature on `minutes-core`**, and *each* front-end binary enables it independently and re-exports it to core:

```
minutes-cli/Cargo.toml   parakeet = ["minutes-core/parakeet"]   # --features parakeet
minutes-app/Cargo.toml   parakeet = ["minutes-core/parakeet"]   # TAURI_FEATURES="parakeet"
```

The engine selection happens entirely inside `minutes-core`. `transcribe_dispatch` (`transcribe.rs:330`) reads `config.transcription.engine` and routes `"parakeet"` → `transcribe_parakeet_dispatch`. That function is feature-gated:

```rust
// transcribe.rs:673
fn transcribe_parakeet_dispatch(...) {
    #[cfg(feature = "parakeet")]      { /* real path */ }
    #[cfg(not(feature = "parakeet"))] { Err(EngineNotAvailable("parakeet")) }  // :723-727
}
```

So the gate is baked into whichever binary you compiled. Both the CLI and the app read the *same* `config.toml`, so if you set `engine = "parakeet"` there and only the CLI was built with the feature:

- `minutes record` → transcribes with Parakeet ✅
- the desktop app → hits the `#[cfg(not(feature = "parakeet"))]` arm → `EngineNotAvailable("parakeet")` ❌

This is the same pattern as Metal/CUDA and `diarize` — all compile-time, per-binary. It's also why the CLAUDE.md "rebuild ALL affected targets" rule exists: a feature change to core means recompiling *every* binary that should expose it.

The one nuance to the "never calls the CLI" rule: *inside* the Parakeet path there's an optional crash-isolation layer that can spawn `minutes parakeet-helper` (resolved via `which("minutes")` — `transcribe.rs:2462`). But that's an internal optimization reached only *after* the app's own `parakeet`-gated code runs — not the app delegating its work to the CLI. The actual ASR work needs the **parakeet.cpp binaries** (`parakeet` / `example-server`), not the `minutes` CLI.

## The Parakeet fallback chain

Once you're inside `transcribe_with_parakeet` (`transcribe.rs:1802`), there are **three execution layers**, tried in order. All run in whatever process linked core (CLI *or* app):

```
                 transcribe_with_parakeet()
                          │
   sidecar_enabled_effective(config)?  ── parakeet_sidecar.rs:1631
   (engine==parakeet OR live backend==parakeet) AND `example-server` resolves
                          │ yes
        ┌─────────────────▼─────────────────┐
        │ LAYER 1: warm sidecar server      │  transcribe_via_global_sidecar (:1251)
        │ persistent `example-server` over  │  process-global, Mutex<Manager>, OnceLock
        │ a Unix socket; model stays warm   │  state: Cold→Starting→Healthy→SubprocessOnly
        └─────────────────┬─────────────────┘
                  Ok ──────┘ return        Err → tracing::warn, fall through
                          │
        ┌─────────────────▼─────────────────┐
        │ LAYER 2: `minutes parakeet-helper`│  only if hints.is_empty() &&
        │ child `minutes` process does ONE  │  no MINUTES_PARAKEET_HELPER_ACTIVE/FORCE_DIRECT
        │ parakeet.cpp call — crash-isolated│  resolve_minutes_parakeet_helper (:2462)
        └─────────────────┬─────────────────┘
              success ─────┘                 non-zero exit / spawn fail ↓ (logged once)
                          │
        ┌─────────────────▼─────────────────┐
        │ LAYER 3: direct parakeet CLI      │  run_parakeet_cli_structured
        │ spawn the `parakeet` C++ binary   │  the unconditional floor
        └───────────────────────────────────┘
```

Notes on each:

- **Layer 1 (sidecar)** is the fast path — a long-lived `example-server` keeps the model resident, so you pay model-load cost once per session instead of per utterance. It's a real state machine (`SidecarState`: `Cold → Starting → Healthy → SubprocessOnly`, `parakeet_sidecar.rs:172`). A live request that fails restarts the server *once*; a second failure trips it to `SubprocessOnly` for that spec, and the whole call falls through to layers 2/3. The binary probe is positive-cached per process (`sidecar_binary_resolves_cached`, :1651) so the hot path doesn't PATH-scan every utterance.

- **FP16 sticky-downgrade** lives in the sidecar layer. On Apple Silicon it launches with `--fp16`, but MPSGraph has FP16 crash signatures (`"MPSGraph"`, `"requires the same element type"`, … :35). When `classify_start_failure` (:1105) matches one, it `DowngradeToFp32`, relaunches without fp16, and **persists a fingerprint** to `parakeet-fp16-blacklist.json` (`remember_fp16_downgrade` :585) so every future run for that model/binary/gpu combo skips fp16 from the start (`apply_sticky_fp16_downgrade` :608). Resettable via `parakeet_fp16_blacklist_reset` config.

- **Layer 2 (helper)** exists purely for **crash isolation**: parakeet.cpp can SIGABRT/segfault on bad GPU states, and you don't want that taking down a recording. Running it in a throwaway `minutes parakeet-helper` child means the crash kills the child; the parent logs once (`loud_once`, :2509 — guards against the #163 silent-fallback regression where the helper's clap flags drifted from the caller's) and drops to Layer 3. It's skipped when `DecodeHints` are non-empty (real meetings usually have calendar/vocabulary hints), since the helper's JSON contract didn't carry hints — those go direct to Layer 3.

- **`sidecar_enabled_effective`** (:1631) is the gate for Layer 1: explicit `parakeet_sidecar_enabled` config wins; otherwise auto-on when the feature is compiled, the engine (batch *or* live) is parakeet, and `example-server` resolves. The live-transcript loop calls `warmup_global_sidecar` at session start (:1269) so the first utterance isn't cold.

So for the desktop app specifically: built with `parakeet`, it runs this entire chain in-process. Its `example-server`/`parakeet` binaries are resolved from PATH and `MINUTES_PARAKEET_SERVER_BINARY` / `parakeet_binary` config — the same resolution the CLI uses (`resolve_server_binary` :1219). The app and CLI share the sidecar's on-disk artifacts (socket under `~/.minutes/tmp/`, the fp16 blacklist), but **not** a running sidecar process — `global_manager()` is a per-process `OnceLock`, so the app and a concurrent CLI each spawn their own `example-server`.

Let me record the per-binary feature-gating fact, since it's the recurring source of confusion.

### assistant · 2026-06-21 06:49:22

Done. To close the loop on your two questions:

**The feature flag question:** The Tauri app must be rebuilt with `TAURI_FEATURES="parakeet"` to use Parakeet. Parakeet in the CLI doesn't carry over, because each binary is a *separate compilation* of `minutes-core` and the engine dispatch is `#[cfg(feature = "parakeet")]`-gated inside core (`transcribe.rs:723-727`). The runtime knob (`engine = "parakeet"` in the shared `config.toml`) only takes effect in a binary that was *compiled* with the feature.

**The CLI-vs-Tauri question:** The desktop app does **not** call the CLI for its work — that's the misconception worth discarding. Both binaries statically link `minutes-core` and do everything (record, transcribe, diarize, summarize, search) in-process by calling `minutes_core::*` directly. They only coordinate through shared files under `~/.minutes/` (PID files, the event log, the job queue, desktop-control IPC). The single place the app touches the `minutes` binary at all is the optional `minutes parakeet-helper` crash-isolation subprocess *inside* the Parakeet path — and even that requires the app to already be a Parakeet build.

A useful litmus test going forward: if a capability is **runtime** (which mic, which summarization engine, where meetings are stored), it's in `config.toml` and both front-ends pick it up automatically. If it's **compile-time** (parakeet, diarize, whisper, Metal/CUDA), every binary that should expose it has to be built with that feature — which is exactly why the build docs and CLAUDE.md keep repeating "rebuild *all* affected targets."

I saved both findings to memory (`project_three_frontends_coordination` and `project_features_are_per_binary`) so this doesn't have to be re-derived next session.

### user · 2026-06-21 07:19:33

Regarding the tauri app and the minutes cli, how could a user verify whether each has been compiled with the parakeet features?

### assistant · 2026-06-21 07:19:42

Good practical question. Let me check the exact mechanisms in code rather than guess at flag names and output.

### assistant · 2026-06-21 07:19:48

CLI side confirmed. Now let me check what the Tauri app exposes — the `cmd_desktop_capabilities` command.

### assistant · 2026-06-21 07:19:59

`cmd_desktop_capabilities` doesn't carry parakeet. The `parakeet_compiled` flag is at line 8455 — let me read that context and the `cmd_warm_parakeet` command.

### assistant · 2026-06-21 07:20:44

Verified both surfaces. Here's how a user checks each — and they must check each *separately*, because the two binaries are independent compilations.

## CLI — `minutes capabilities --json`

This is the canonical, scriptable check. The report includes a Cargo-feature-gated key set directly from `cfg!(feature = "parakeet")` (`main.rs:4949`):

```bash
minutes capabilities --json | jq '.features.parakeet'
# true  → this CLI binary was built with parakeet
# false → it wasn't
```

Full context if you want it: `minutes capabilities --json` emits `{version, api_version, features:{…}}`, and `features.parakeet` / `features.diarize` are the compile-time ones (everything else is always `true`).

**Caveat — "the CLI" can be ambiguous.** There may be more than one `minutes` on the machine (a `cargo install` build, a Homebrew build, and the one the app symlinks from its bundle into `~/.local/bin/minutes`). They can have different features. So pin down *which* one first:

```bash
which minutes                              # which binary is on PATH
minutes capabilities --json | jq '.version, .features.parakeet'
```

## Tauri app — Settings screen (no headless flag)

The app surfaces the same `cfg!(feature = "parakeet")` of *its own* binary through `cmd_get_settings`, under `transcription.parakeet_compiled` (`commands.rs:8455`), alongside `parakeet_status`. In practice that means: **open the app → Settings → Transcription**, and the Parakeet section reflects whether the app binary was built with the feature.

There is **no** capabilities subcommand on the app binary itself — `minutes-app` only recognizes a couple of internal early-exit flags (`--diagnose-hotkey`, `--process-queue-worker`), not a `capabilities`/`--version` probe. So the runtime self-report goes through the GUI, not the terminal. Note that `cmd_desktop_capabilities` (the other "capabilities" command) is about platform/calendar/call-detection/tray/dictation — it does **not** carry the parakeet flag; the parakeet flag lives in the settings payload.

## Two distinctions worth keeping straight

1. **Per-binary, independent.** `minutes capabilities` tells you about the CLI only; the app's Settings tells you about the app only. It's entirely possible (and a common confusion) for one to be `true` and the other `false`.

2. **"Compiled in" ≠ "ready to run."** `parakeet_compiled: true` / `features.parakeet: true` only means the binary *can* dispatch to Parakeet. Actually transcribing also needs the runtime pieces resolvable: the `parakeet` (and optionally `example-server` sidecar) C++ binaries on PATH and a downloaded Parakeet model. The app's `parakeet_status` field reports that runtime readiness; on the CLI, `minutes setup --parakeet` and `minutes health` cover it. So the complete check is "feature compiled in" **and** "runtime binaries + model present."

### user · 2026-06-21 07:30:40

Did we go deeper into the parakeet sidecar/subprocess fallback chain? What exactly does 'sidecar' mean in this context?

### assistant · 2026-06-21 07:31:06

Fair challenge — I gave you the *chain* but didn't really define what the "sidecar" itself **is**. Let me read the launch + socket-protocol internals so I can answer precisely, because "sidecar" is actually an overloaded word in this codebase.

### assistant · 2026-06-21 07:31:16

Let me grab the request/response protocol over the socket to complete the picture.

### assistant · 2026-06-21 07:32:03

Yes — and your instinct is right that I described the *shape* of the chain (Layer 1 sidecar → Layer 2 helper → Layer 3 direct) and the FP16 downgrade, but I never actually defined what the sidecar **is**. Now I've read the launch and socket code, so here's the precise answer.

## "Sidecar" is overloaded in this codebase — three distinct meanings

This is almost certainly why the term feels slippery. It's used in three unrelated senses:

| Sense | Where | What it means |
|-------|-------|---------------|
| **Companion process** | `parakeet_sidecar.rs` | A long-lived helper *process* holding the model warm (the one you're asking about) |
| **Companion file** | `live-transcript-status.json`, `events.seq`, `recording-meta.json` | A small *file* written next to a primary artifact ("status sidecar") |
| **Alongside-recording transcription** | `live_transcript.rs` (`run_sidecar_inner_mpsc`, `RecordingSidecarVad`, `TranscriptSource::"recording-sidecar"`) | Live transcription running *alongside* a recording, vs a standalone live session |

In the Parakeet context it's the **first** sense — borrowed from the microservices / Kubernetes "sidecar" pattern: a secondary process that runs beside the main one to provide a supporting capability.

## What the Parakeet sidecar actually is

It's a **separate, long-lived companion process** — the `example-server` binary that ships with parakeet.cpp — that loads the Parakeet model **once** and answers transcription requests over a **Unix domain socket**, so the host (CLI or app) doesn't pay model-load cost per utterance.

**Why it has to exist (the whole motivation):** whisper-rs is *linked into* the Minutes binary, so the whisper model loads into the host process and stays resident for free. Parakeet.cpp is an **external C++ binary** — there's no in-process model. The naive approach (spawn `parakeet <model> <wav>` per utterance, which is exactly Layer 3) reloads the multi-hundred-MB model on every single call. That's tolerable for one-shot batch processing but fatal for live transcription, where you transcribe an utterance every few seconds. The sidecar fixes this: spawn the model-holding server once, then fire cheap per-utterance requests at it.

**How it's launched** (`start_once`, `parakeet_sidecar.rs:463`):
```
example-server <socket_path> <model_path> <vocab_path> --model <model_id> [--gpu] [--fp16] [--vad <path>]
```
stdout is `/dev/null`, stderr is piped into a 200-line ring buffer for diagnostics. Right after spawn it runs a **health check** — sends a `__minutes_healthcheck__` request with a tiny generated WAV; if the server isn't answering within the 30s startup timeout, it's a `StartFailure` and the call falls through to Layers 2/3.

**The wire protocol** (`request_sidecar`, `:1007`): newline-delimited JSON over the socket.
- Client `UnixStream::connect`s, writes one `SidecarRequest` line: `{request_id, audio_path, decoder, timestamps, use_vad, beam_width, lm_path, lm_weight, boost_phrases, boost_score}` — note **audio is passed by file path** (the temp WAV), not streamed as bytes.
- Reads one `SidecarResponse` line: `{ok, request_id, text, elapsed_ms, word_timestamps[], error}`.
- Per-request read timeout scales with audio length: `(duration_secs × 2).clamp(120s, 30min)` (`:1002`).

**Lifecycle / who owns it:** a process-global `OnceLock<Mutex<ParakeetSidecarManager>>` (`global_manager`, `:1246`) with the state machine `Cold → Starting → Healthy(RunningSidecar) → SubprocessOnly | Stopping`. Because it's per-process, the CLI and the desktop app each spawn and own **their own** `example-server` — they share the on-disk socket dir and fp16 blacklist file, but never a running server. It's shut down via `shutdown_global_parakeet_sidecar()` on every exit path (which is why both `main`s call it).

## So the corrected mental model of the chain

```
Layer 1  example-server (sidecar PROCESS)  ── model warm, JSON-over-Unix-socket, FP16 sticky-downgrade
   │  spawned once per host process; reused across utterances
   ▼  (spawn/health-check fails, or live request fails twice → SubprocessOnly)
Layer 2  minutes parakeet-helper (child process)  ── crash isolation, one parakeet.cpp call then exits
   ▼  (helper rejects/spawn-fails, or hints non-empty → skipped)
Layer 3  parakeet <model> <wav> (direct subprocess)  ── reloads model every call; the unconditional floor
```

The key distinction the word "sidecar" encodes: **Layer 1 is the only layer that keeps the model resident.** Layers 2 and 3 are spawn-per-utterance and reload the model each time — fine as fallbacks, but the sidecar is what makes Parakeet viable for live transcription.
