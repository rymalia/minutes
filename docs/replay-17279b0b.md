# Session replay: `17279b0b-265a-4b18-87fa-6661125e349f`

- **main**: `/Users/rymalia/.claude/projects/-Users-rymalia-projects-minutes/17279b0b-265a-4b18-87fa-6661125e349f.jsonl`
- **subagents**: 8 file(s) in `/Users/rymalia/.claude/projects/-Users-rymalia-projects-minutes/17279b0b-265a-4b18-87fa-6661125e349f/subagents/`
- **cwd**: `/Users/rymalia/projects/minutes`
- **turns**: 97
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

### user · 2026-06-21 08:12:56

I want to clarify my mental model and determine whether I am correctly understanding all of this.

My understanding (please validate or refute or clarify):

- When we say "minutes cli", we are referring to the binary at:  `~/.local/bin/minutes`
- When we say Minutes app, Desktop app or Tauri app, we are referring to the app bundle at: `/Applications/Minutes.app`

You have referred to the minutes cli as a "clap, 55 commands" -- what does that mean, what is a "clap"?

You've also mentioned the "minutes-core (rust lib)" being a separate but common element used by both the minutes cli and the minutes app. I need that explained further.

```
`minutes-core` is the shared engine (feature-gated), and both `minutes-cli` and `minutes-app` (Tauri) link it.
```

I need these two sentences clarified:
* `There are three front-ends — the minutes CLI, the Tauri desktop app, and the MCP server — sitting on top of one shared Rust engine (minutes-core).` 
* `The CLI and Tauri app both statically link minutes-core and call it directly in-process.`

What does "link" mean in these contexts?
Is there a binary or file somewhere named "minutes-core"?
Is minutes-core a *single entity* that is commonly referenced by these 3 different front-ends or is it something *replicated* three times for each of the front-ends?

Can you think of any better ways to test my understanding of the 3 front-end + minutes-core concept model?

### assistant · 2026-06-21 08:13:40

Great questions — these get at the foundational "what is actually on disk vs. running" model, which is worth nailing down precisely. Let me ground the answer in real evidence from your machine rather than just assert it.

### assistant · 2026-06-21 08:14:27

This is perfect — your machine illustrates every concept beautifully. Notice three things already: you have **two** different `minutes` CLI binaries, the app's real executable is `minutes-app` (47 MB), and `minutes-core` exists only as `.rlib` build scraps. Let me make one more concrete comparison, then explain.

### assistant · 2026-06-21 08:20:26

Ha — the experiment even surprised me, in an instructive way. Let me walk through everything, grounded in what we just saw.

## 1. Your two path claims — both essentially right, with real nuances

**"minutes CLI" = `~/.local/bin/minutes`** ✅ — *for you, right now.* But the precise definition is "whichever `minutes` the shell finds first on your `PATH`," and you actually have **two**:

| Path | Version | Source |
|------|---------|--------|
| `~/.local/bin/minutes` | **0.18.6** | this project's `cp` install (wins — earlier on PATH) |
| `~/.cargo/bin/minutes` | **0.18.5** | an older `cargo install` |

This is the single best illustration of why I keep saying "*which* minutes?" — they're different files, different versions, and could even have had different features. `which minutes` tells you the winner. This is exactly the ambiguity to keep in mind.

**"Minutes app" = `/Applications/Minutes.app`** ✅ — but with an important detail: a macOS `.app` is **a folder, not a program**. The actual executable that runs is inside it:

```
/Applications/Minutes.app/Contents/MacOS/
├── minutes-app          ← 47 MB — THE Tauri app (this is "the desktop app")
├── minutes              ← 52 bytes — a bundled pointer to the CLI sidecar
├── calendar-events      ← helper sidecar binaries
├── mic_check
└── system_audio_record
```

So when I say "the Tauri app binary," I mean `minutes-app`. (You also have the `~/Applications/Minutes Dev.app` dev identity from CLAUDE.md, currently not populated.)

## 2. What "clap" means

**clap** = "**C**ommand **L**ine **A**rgument **P**arser." It's a popular Rust *library* (you saw it in `Cargo.toml`: `clap = { version = "4", ... }`). It's the thing that turns the raw text you type — `minutes record --title "Standup" --mode meeting` — into structured data the program can act on, and auto-generates `--help`, version output, validation, and errors.

"clap, 55 commands" was shorthand for: *the CLI uses the clap library to define its command surface, which is roughly 50+ subcommands* (`record`, `stop`, `live`, `search`, `setup`, …). The CLI's whole job is "parse what the user typed with clap, then call the right `minutes-core` function." (The exact count is fuzzy — CLAUDE.md says 45; the clap enum has ~55 including hidden maintainer commands. Don't anchor on a number.)

## 3, 4, 5 — the core concept: library crate, "link," single-vs-replicated

This is the heart of your question, so let me build it from the ground up.

**A "crate" is Rust's unit of compiled code.** There are two kinds:
- **Binary crate** → compiles to an *executable* (a program with a `main()` you can run). `minutes-cli` and `minutes-app` are binary crates.
- **Library crate** → compiles to *reusable code with no `main()`*. It **cannot run on its own** — it only exists to be used by other crates. `minutes-core` is a library crate.

**So `minutes-core` is source code, not a program.** It lives at `crates/core/` as `.rs` files. When compiled, it becomes a `.rlib` file (Rust's static-library format) — which is exactly what `find` turned up:

```
target/release/deps/libminutes_core-afe0267da8026013.rlib   ← a build intermediate
```

That `.rlib` is **not installed, not runnable, and not what you launch.** You will never see `minutes-core` in Activity Monitor — only `minutes`, `minutes-app`, and maybe `example-server`/`claude`.

**What "link" means.** Compiling a program happens in two phases: *compile* each crate to machine code, then *link* — stitch those compiled pieces together into one final executable. **"Statically link `minutes-core`"** means: at build time, the compiler **copies minutes-core's compiled machine code directly into the output binary.** The result is a self-contained executable that carries its own copy of core inside it.

So the answer to your central question:

> Is minutes-core a *single entity* referenced by the 3 front-ends, or *replicated* three times?

**Single in source, replicated in the compiled binaries.** There is exactly one `minutes-core` codebase (one folder, one version in git). But when you build, its compiled code gets **baked into each binary independently.** Your evidence shows it directly:

- `minutes` (CLI) = **32 MB** — contains its own compiled copy of core
- `minutes-app` (Tauri) = **47 MB** — contains *another* compiled copy of core, plus the Tauri/WebView/UI machinery (that's the extra ~15 MB)

There is **no shared `minutes-core` file sitting on disk that both load at runtime.** Each binary is self-sufficient.

A useful analogy: `minutes-core` is a **recipe**, and the two binaries are two **cakes** baked from it. Each cake has the recipe's ingredients baked *into* it. There's no shared bowl of batter in the fridge at dinnertime — and if you used decaf espresso (omitted the `parakeet` feature) when baking one cake, *that* cake is decaf no matter what the other one contains. **That is precisely why features are per-binary** — it's the same fact viewed from the build side.

*(The contrast, for completeness: **dynamic linking** — `.dylib`/`.so`/`.dll` files — is when one shared library file lives on disk and multiple programs load it at runtime. That *would* be "one entity referenced by three." Rust crates link statically by default, so that's not what happens here.)*

**A footnote on my failed experiment:** I tried to count `minutes_core` symbols inside each binary with `nm` and got `0` for both — which looks like it contradicts everything I just said. It doesn't. Your release builds use `strip = true` (in the workspace `Cargo.toml`), which *removes the symbol names* to shrink the binary. The code is still baked in (that's the 32 MB / 47 MB); the human-readable labels were stripped, so `nm` sees nothing. The binary **sizes** are the real proof of embedding.

## The MCP server is the asterisk

When I said "three front-ends on top of minutes-core," that's slightly loose, and worth tightening now that the model is clear:

- **CLI and Tauri app**: *link* minutes-core → each carries a compiled copy, calls it directly in-process. **No `minutes` subprocess involved.**
- **MCP server**: written in **TypeScript**, so it *cannot* link a Rust library. It does **not** contain minutes-core. Instead it **shells out to the `minutes` CLI binary** (`execFile("minutes", ["search", "--json"])`) and reads the markdown files directly. So it sits on top of core *transitively, through the CLI.*

So precisely: **two binaries embed core; the third talks to core by running the CLI.**

## 6. Better ways to test your own understanding

Here are predictive tests — if you can call the outcome before running, you've got it:

1. **Activity Monitor test.** Start a recording from the app and predict the process names you'll see. (Answer: `minutes-app`, maybe `example-server`/`claude` — *never* `minutes-core`. It's not a runnable thing.)

2. **Delete-the-CLI test.** `rm ~/.local/bin/minutes ~/.cargo/bin/minutes`. Predict: does the **app** still record and transcribe? (Yes — it embeds core, doesn't need the CLI.) Does **MCP** still work? (It degrades to read-only markdown reading and tries to auto-reinstall the CLI.) This cleanly separates which front-ends actually depend on the CLI *binary*.

3. **Feature-divergence prediction.** Suppose you `cargo build --features parakeet` the CLI but build the app *without* `TAURI_FEATURES="parakeet"`, and set `engine = "parakeet"` in the shared `config.toml`. Predict each: `minutes record` → ✅ transcribes; the app → ❌ `EngineNotAvailable`. (You already understood this — it's the same "decaf cake" fact.)

4. **Binary-size reasoning.** Explain *why* `minutes-app` (47 MB) is bigger than `minutes` (32 MB), given both embed core. (Tauri + WebView + the bundled UI assets.)

5. **The "two CLIs" check** (you can run this now): `~/.local/bin/minutes --version` vs `~/.cargo/bin/minutes --version` → 0.18.6 vs 0.18.5. If you understand *why two binaries can report different versions and even different features*, you've internalized "replicated, not shared."

6. **The naming test.** Question: "Where is the `minutes-core` executable installed?" Correct answer: *trick question — there isn't one.* It's a library; it only ever exists as source (`crates/core/`) and as `.rlib` build intermediates that get baked into the two binaries.

Want me to actually run test #2 or #5 against a throwaway copy, or diagram the build→link→run flow visually? I can also show the exact `Cargo.toml` lines where each binary "pulls in" core, if seeing the dependency declaration would help cement it.

### user · 2026-06-21 08:37:27

So at what level is versioning set? It feels obvious to me there would be a version number for the `minutes-core`, and it could be possible for `minutes-app` and `minutes-cli` to be out of sync if they were compiled at different times and each have linked different versions of `minutes-core` - is that correct? Then within this specific project repo, do they publish version numbers at the `minutes-core` level and also for  `minutes-app` and `minutes-cli`?

And diagram the build→link→run flow visually

### assistant · 2026-06-21 08:37:54

Let me verify the actual version wiring in the repo rather than reason from memory — the Tauri side in particular has a subtlety.

### assistant · 2026-06-21 08:39:00

All confirmed. Here's the complete picture.

## At what level is versioning set?

**One number, at the workspace level — and core/CLI/app are deliberately locked to it, not versioned independently.**

```
Cargo.toml  [workspace.package]  version = "0.18.14"   ← THE single source of truth
   │
   ├── crates/core   version.workspace = true   → 0.18.14   (minutes-core)
   ├── crates/cli    version.workspace = true   → 0.18.14   (minutes-cli)
   └── tauri/src-tauri  version = "0.1.0"  ← vestigial, ignore it
              the REAL app version lives in tauri.conf.json → 0.18.14
```

So your intuition is right that `minutes-core` *has* a version number — but it's **not bumped on its own cadence.** It inherits the one workspace version. core, cli, and the app all move together as 0.18.14. (The Tauri Cargo crate's `0.1.0` is a throwaway internal number nobody sees; the user-facing app version is in `tauri.conf.json`, which the release checklist keeps synced to 0.18.14 by hand.)

**The one deliberate exception:** `whisper-guard` (0.3.0) is the sub-crate that "ships on its own cadence" — it's the only piece versioned and published independently. Everything else is unified.

There's also a wrinkle worth pointing out so it doesn't confuse you later: the CLI declares its dependency on core as `{ path = "../core", version = "0.18.6", ... }`. That `version = "0.18.6"` is **not** what gets linked — it's a *minimum-version constraint* that only matters if core were pulled from crates.io. For a `path` dependency, Cargo always uses the local source (currently 0.18.14) and the constraint is just a floor (and here it's a slightly stale floor — harmless).

## Can the app and CLI be out of sync? Two different axes — and the answer differs

**Axis 1 — within a single repo checkout: No, they cannot diverge.** Both the CLI and the app depend on core via a **`path =` dependency** pointing at the *same* `crates/core/` folder. At any given commit there is exactly one `minutes-core` source on disk, so both binaries compile and link the **identical** core. You can't build a CLI and an app from the same tree and have them embed different core versions — it's structurally impossible.

**Axis 2 — across different build times / install channels: Yes, absolutely — and your machine is living proof.** This is the real version-drift, and it's exactly the divergence you're intuiting, just located at the *install* axis rather than the *linking* axis:

- Your two CLIs: `~/.local/bin/minutes` = **0.18.6**, `~/.cargo/bin/minutes` = **0.18.5** — built from two different commits at two different times.
- Your installed app (`/Applications/Minutes.app`) was built **Jun 2**; a CLI you `cargo build` today would be newer still.

The app and CLI update through **separate channels** — the app via its in-app updater / DMG, the CLI via `cp`/`cargo install`/`brew`. Nothing keeps the *installed artifacts* in lockstep, so they routinely drift. (This is a known operational fact for this project: after an in-app update you re-sync the CLI separately, e.g. `brew upgrade minutes`.)

So the precise statement: **same source tree → always identical core; different build/install moments → freely divergent.** The repo guarantees consistency at build time; it does *not* guarantee it across whatever you happen to have installed.

## The build → link → run flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. SOURCE  (one repo checkout @ commit X — everything is version 0.18.14)    │
│                                                                               │
│   crates/core/   ──┐  library crate (no main(), can't run)                    │
│     *.rs           │                                                          │
│   crates/cli/   ───┤  binary crate ─ depends on core via  path="../core"      │
│     main.rs (clap) │                                                          │
│   tauri/src-tauri/─┘  binary crate ─ depends on core via  path="../../core"   │
│     main.rs           ▲                                                        │
│                       └── BOTH point at the SAME core folder → same version   │
└───────────────────────────────────┬───────────────────────────────────────────┘
                                     │  cargo build  (release: strip=true)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  2. COMPILE   each crate → machine code                                       │
│                                                                               │
│   core   → libminutes_core-<hash>.rlib   (static library, in target/deps/)    │
│            ⚠ a build intermediate — never installed, never run                │
│   cli    → object code (with its own copy of core's feature flags)            │
│   app    → object code  +  Tauri / WebView / UI assets                        │
└───────────────────────────────────┬───────────────────────────────────────────┘
                                     │  LINK = copy core's compiled code
                                     │  INTO each binary (static linking)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  3. LINKED BINARIES   (self-contained — each carries its OWN baked-in core)   │
│                                                                               │
│   target/release/minutes        32 MB  = [ cli code | COPY of core ]          │
│   target/release/minutes-app    47 MB  = [ app code | COPY of core | Tauri ]  │
│                                              ▲ two independent copies          │
└──────────────────┬────────────────────────────────────────┬───────────────────┘
        cp / cargo / brew                          cargo tauri build + install
                   ▼                                          ▼
┌──────────────────────────────────┐      ┌──────────────────────────────────────┐
│  4a. INSTALL (CLI)               │      │  4b. INSTALL (App)                    │
│  ~/.local/bin/minutes  (0.18.6)  │      │  /Applications/Minutes.app/           │
│  ~/.cargo/bin/minutes  (0.18.5)  │      │    Contents/MacOS/minutes-app         │
│   ↑ separate channel,            │      │   ↑ separate channel (in-app updater) │
│     can drift in version         │      │     can drift in version              │
└──────────────────┬───────────────┘      └──────────────────┬───────────────────┘
                   ▼                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  5. RUN   (what you'd see in Activity Monitor)                                │
│                                                                               │
│   `minutes record`        → process: minutes          ─┐ each calls its OWN   │
│   click Record in the app → process: minutes-app      ─┘ embedded core        │
│   (parakeet warm path)    → child process: example-server                     │
│                                                                               │
│   ✗ there is NO "minutes-core" process — it's library code, baked in          │
└─────────────────────────────────────────────────────────────────────────────┘

   ┌──────────────────────────────────────────────────────────────────────────┐
   │  MCP server (the asterisk): TypeScript, does NOT embed core.              │
   │  It SHELLS OUT →  execFile("minutes", ["search","--json"])  ──► whichever  │
   │  `minutes` is on PATH (so it inherits THAT binary's version + features).   │
   └──────────────────────────────────────────────────────────────────────────┘
```

The two ideas to anchor on:

- **Steps 1–2 guarantee consistency:** one source, `path` deps, one workspace version → both binaries embed identical core. No within-tree drift.
- **Steps 4–5 allow drift:** the *installed* CLI and app are independent artifacts on independent update channels, so what you actually have running can be different versions (your 0.18.5 / 0.18.6 / Jun-2-app trio). And the MCP server has no version of its own at the core level — it borrows whatever CLI it finds on PATH.

Want me to render this as a polished HTML diagram you can keep open alongside the code, or is the ASCII version enough?

### user · 2026-06-21 08:39:01

yes, please be strict about always grounding all references to the real codebase and not "in theory"

### assistant · 2026-06-21 08:39:15

Understood — and I'll treat that as a standing instruction: every claim grounded in the actual files, no "in theory." Let me first verify the one thing in my diagram I hand-waved (the 52-byte `minutes` in the app bundle), then render the HTML and record your grounding preference.

### assistant · 2026-06-21 08:39:42

Important correction caught by your instruction: the 52-byte bundle file is **not** "a pointer to the CLI sidecar" as I claimed — `file` reports it's a placeholder shell script that prints `minutes CLI placeholder` and `exit 1`. So in *this* installed app (built Jun 2), there is no real bundled CLI; it's a stub. That's exactly the kind of "sounds right but isn't" claim your grounding rule is meant to catch. Let me record the preference and render the verified diagram.

### assistant · 2026-06-21 08:39:56

Now let me render the verified diagram as HTML.

### assistant · 2026-06-21 08:40:05

I'll build this as a flow diagram. Let me read the relevant template and patterns first, per the skill.

### assistant · 2026-06-21 08:44:28

Template patterns absorbed. Now I'll build the page — blueprint aesthetic, every node and table cell traceable to a verified file read or shell command from this session.

### assistant · 2026-06-21 08:48:12

Opened in your browser:

**`~/.agent/diagrams/minutes-build-link-run.html`**

The page has four parts, all grounded in this session's file reads and shell commands:

1. **The build → link → run flowchart** (Mermaid, zoomable) — five stages: SOURCE (one checkout, all 0.18.14) → COMPILE (`.rlib`) → LINK (core copied *into* each binary) → INSTALL (separate channels) → RUN (process names). The MCP server hangs off to the side, shelling out to whichever `minutes` is on PATH.

2. **Verified evidence table** — every claim traced to its source: `crates/core/Cargo.toml`, the `.rlib` artifacts, the two CLI byte-sizes/versions (32,201,968 B / 0.18.6 and 32,917,776 B / 0.18.5), the 46,967,968 B `minutes-app`, the `transcribe.rs:330/673/723` parakeet gate, and the MCP `execFile` shell-out.

3. **Version-source table** — workspace `0.18.14` as the single source of truth, the vestigial `0.1.0` Tauri Cargo version vs. the real `tauri.conf.json` `0.18.14`, and `whisper-guard` (`0.3.0`) as the lone independent-cadence crate.

4. **The two divergence axes** — within one checkout (can't diverge) vs. across install moments (your 0.18.6 / 0.18.5 / Jun-2-app trio proves it does).

Two corrections this round, both from your grounding rule:
- The bundle's `minutes` is a **52-byte placeholder shell script** (`echo 'minutes CLI placeholder'; exit 1`), not a real bundled CLI — so I withdrew my earlier "bundled pointer to the sidecar" claim. The page states it plainly.
- The `nm` check showed **0 core symbols** — not a contradiction, but because `strip = true` in the release profile removes symbol names; the 32/47 MB sizes are the real proof of embedding. That nuance is now in the evidence table.

I also saved your grounding preference to memory (`feedback_ground_in_real_codebase`) so it carries into future sessions. The footer notes that the byte sizes/versions reflect what's *installed on this machine*, not repo HEAD.

### user · 2026-06-21 09:02:01

Now diagram the parakeet sidecar fallback chain visually

### assistant · 2026-06-21 09:03:05

Same grounding discipline — every node and line below traces to `transcribe.rs` or `parakeet_sidecar.rs`, which I read directly. Let me build it (Dracula-inspired this time, to vary the aesthetic).

### assistant · 2026-06-21 09:05:05

Opened in your browser:

**`~/.agent/diagrams/minutes-parakeet-fallback.html`**

Two linked Mermaid diagrams plus three reference tables, every node and line traced to code I read this session:

1. **The fallback chain** — from the `engine == "parakeet"` gate (`transcribe.rs:330`) and the `#[cfg(feature)]` check (`:673/:723`), through the chunking decision, into `transcribe_with_parakeet` (`:1802`), then the three layers in order: **Layer 1** warm sidecar (`transcribe_via_global_sidecar :1251`) → **Layer 2** crash-isolated `minutes parakeet-helper` (`:1931`) → **Layer 3** direct `parakeet` subprocess. The `Err → warn "falling back"` and `non-zero → log_once → L3` edges are the actual fall-through transitions.

2. **The sidecar state machine** — `Cold → Starting → Healthy`, with the two failure exits: the **FP16 crash signature → DowngradeToFp32 → relaunch** loop (`classify_start_failure :1105`, `remember_fp16_downgrade :585`) and `→ SubprocessOnly` (which is what hands control back to Layers 2/3).

3. **Reference tables** — binary/helper resolution order for each layer (`resolve_server_binary :1219`, `resolve_minutes_parakeet_helper :2462`, `parakeet.rs:227`), and the verified timeout constants (startup 30s, connect 3s, fp16 window 60s, request 120s–30min) plus the per-process `OnceLock<Mutex>` ownership.

Two grounded callouts: the **socket protocol** (newline-delimited JSON, audio passed by path, `request_sidecar :1007`) and the **FP16 sticky-downgrade**. And a closing note reiterating that "sidecar" here means *only* the Layer-1 companion process — distinct from the codebase's other two uses of the word (companion files; the recording-sidecar live mode).

One honesty note on precision: the top-level layer/function line numbers (330, 673, 723, 1802, 1251, 1925, 2462, 1219, 1105, 585) and the constants are all from direct reads. A few sub-line refs inside the helper fall-through (e.g. the `log_*_once :1978`) are approximate to the block I read around lines 1966–2020 rather than exact — if you want, I can pin those to the precise lines.

### user · 2026-06-21 20:55:50

Great deep-dive information all stemming from an inital "/claude-mem:learn-codebase" call. Now package all of this up into a robust reference document we can look back on.

### assistant · 2026-06-21 20:56:08

A reference document is the right capstone. Let me check the `docs/` conventions so it lands in the right place and doesn't clobber anything.

### assistant · 2026-06-21 21:20:22

No existing `ARCHITECTURE.md` — and the convention is `UPPERCASE-HYPHENATED.md`. I'll write the canonical `docs/ARCHITECTURE.md`, grounded with file:line references throughout and linking the two diagrams.

### assistant · 2026-06-21 21:22:55

Now let me make the package self-contained by copying the two diagrams into the repo alongside the doc, and point the doc at the repo copies.

### assistant · 2026-06-21 21:23:00

There's already a `docs/diagrams/` directory (with a prior `minutes-architecture.html`). Let me update the doc's diagram links to point at the repo copies.

### assistant · 2026-06-21 21:23:21

Packaged. Everything from this deep dive is now consolidated into a durable, version-controllable reference in the repo.

## What was created

| Artifact | Location | What it is |
|----------|----------|------------|
| **Architecture reference** | `docs/ARCHITECTURE.md` | 14-section markdown reference, grounded with `file:line` throughout |
| **Diagram 1** | `docs/diagrams/minutes-build-link-run.html` | Build → link → run + three front-ends (copied into repo) |
| **Diagram 2** | `docs/diagrams/minutes-parakeet-fallback.html` | Parakeet fallback chain + sidecar state machine (copied into repo) |

The doc links to both diagrams via repo-relative paths, so the whole package travels together and is self-contained.

## What `docs/ARCHITECTURE.md` covers

1. The one-paragraph mental model
2. The three front-ends + `minutes-core` (crate table)
3. Build → link → run (library vs binary crate, static linking, single-source/replicated)
4. Versioning (workspace-level, the two divergence axes, whisper-guard's independent cadence)
5. The coordination layer — `pid.rs`, `desktop_control.rs`, `events.rs`, `jobs.rs`
6. The async `record` / sync `process` split
7. The processing pipeline (11 stages)
8. The live/streaming subsystem
9. Transcription engines + the **Parakeet 3-layer fallback chain**, sidecar state machine, FP16 sticky-downgrade, socket protocol
10. Diarization + L0–L3 speaker attribution
11. Summarization + structured extraction
12. The MCP server (capabilities contract, recording delegation)
13. Compile-time features per-binary + **how to verify** each binary
14. Key file map

A few deliberate choices worth flagging:
- **Grounding held throughout** — every structural claim carries a `file:line`, and the doc states up front that line numbers are "start reading here," approximate to 0.18.14 and drift over time. The corrected facts from earlier (the 52-byte bundle stub, the `strip = true` reason `nm` shows 0 symbols) are baked in.
- **`docs/diagrams/` already existed** (there's a prior `minutes-architecture.html` from May 15) — so I added to it rather than inventing a new convention.
- I followed your git restriction — **nothing committed**. When you're ready, a suggested commit message:

```
docs: add architecture reference + build/parakeet diagrams

Add docs/ARCHITECTURE.md — a grounded deep-dive reference covering the
three front-ends (CLI/Tauri/MCP) over minutes-core, the ~/.minutes
coordination layer, the record/process async split, the pipeline, the
live/streaming subsystem, the Parakeet sidecar fallback chain, versioning,
and per-binary compile-time features. Include two interactive HTML diagrams
under docs/diagrams/.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01TBqU7PBPbXfT8sRoi8md7z
```

Want me to add a link to `docs/ARCHITECTURE.md` from the project structure section of `CLAUDE.md` (or the README you have open) so it's discoverable, or run `/session-summary` to close out the session per your workflow?

### user · 2026-06-21 21:32:12

Please add a frontmatter section to your `docs/ARCHITECTURE.md` file to record at least the date of this assessment and any other relevant info you think should be included.

/init please create file `CLAUDE.local.md` for our use -- this repo contains a committed `CLAUDE.md` which essentially makes it an uneditable file for us so let's use a local override for our needs.
Then you can add a link to `docs/ARCHITECTURE.md` as you suggested.

### assistant · 2026-06-21 21:32:47

I'll honor the `/init` command, then adapt it to your explicit need (a local `CLAUDE.local.md` override rather than touching the committed `CLAUDE.md`).

### assistant · 2026-06-21 21:33:14

The init skill targets `CLAUDE.md`, but per your explicit instruction I'll create a lean **`CLAUDE.local.md`** override instead — not duplicating the committed `CLAUDE.md`, just adding local-use guidance and the `docs/ARCHITECTURE.md` link. Let me gather a couple of facts first (ignore status + commit for frontmatter).

### assistant · 2026-06-21 21:47:33

`CLAUDE.local.md` isn't covered by `.gitignore` (it only ignores `.claude/*.local.md`). To keep it truly local without modifying the committed `.gitignore`, I'll add it to `.git/info/exclude` (per-clone, never committed). Doing all three tasks now:

### assistant · 2026-06-21 21:48:13

Frontmatter added and `CLAUDE.local.md` is now locally ignored. Now creating the file itself:

### assistant · 2026-06-21 21:48:41

All three done.

| Task | Result |
|------|--------|
| **Frontmatter on `docs/ARCHITECTURE.md`** | YAML block with `date: 2026-06-21`, `assessed_version: 0.18.14`, `assessed_commit: 8a45434`, `branch: main`, the assessment method, companion-diagram paths, and a line-number-drift caveat |
| **`CLAUDE.local.md` created** | Lean local override — explains its relationship to the committed `CLAUDE.md`, links `docs/ARCHITECTURE.md` + both diagrams, and carries a "fast facts" cheat-sheet plus your grounding preference |
| **Kept it truly local** | Added `CLAUDE.local.md` to `.git/info/exclude` (per-clone, never committed) rather than editing the committed `.gitignore`; confirmed `git check-ignore` now flags it |

A few deliberate choices worth noting:

- **Why `.git/info/exclude`, not `.gitignore`:** `.gitignore` only ignores `.claude/*.local.md`, not a root-level `CLAUDE.local.md`. Editing `.gitignore` would itself be a committed change affecting everyone. `.git/info/exclude` keeps the override genuinely yours.
- **Didn't touch the committed `CLAUDE.md`** — exactly as you asked. `CLAUDE.local.md` is additive; it explicitly defers build/test/release/git rules to the committed file and only adds local context + the architecture pointer. Future Claude Code instances auto-load `CLAUDE.local.md` alongside `CLAUDE.md`, so the link and fast-facts will be in context automatically.
- **No duplication** — per the init skill's guidance, I avoided re-listing commands or file trees that already live in `CLAUDE.md` / `docs/ARCHITECTURE.md`.

Since `docs/ARCHITECTURE.md` and `docs/diagrams/*.html` *are* committable (they're real repo docs) while `CLAUDE.local.md` is not, a suggested commit for just the shareable artifacts:

```
docs: add architecture reference + build/parakeet diagrams

Add docs/ARCHITECTURE.md (with assessment frontmatter) — a grounded
deep-dive covering the three front-ends over minutes-core, the ~/.minutes
coordination layer, the record/process async split, the pipeline, the
live/streaming subsystem, the Parakeet sidecar fallback chain, versioning,
and per-binary compile-time features. Include two interactive HTML diagrams
under docs/diagrams/.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01TBqU7PBPbXfT8sRoi8md7z
```

Want me to run `/session-summary` to close out per your workflow?

### user · 2026-06-21 21:52:26

_(invoked /session-tools:session-summary)_

### assistant · 2026-06-21 21:52:29

I'll gather the metadata, then write the summary.

### assistant · 2026-06-21 21:53:36

Session summary written to **`docs/session-summary-2026-06-21-architecture-deep-dive.md`**.

Metadata captured from the collection script and SessionStart env:
- **session_id:** `17279b0b-265a-4b18-87fa-6661125e349f`
- **time:** 2026-06-20 11:08 PM PDT – 2026-06-21 2:52 PM PDT (spanned two dates, so both are shown)
- **branch** omitted (`main`), **resumed** omitted (not resumed), **related_pr** omitted (no open PRs)

The summary scales to the session's arc — a `learn-codebase` deep dive that resolved your CLI-vs-Tauri mental model and produced durable artifacts. It includes the optional **Discoveries / Handoff Notes** and **Current State** sections because the session had non-obvious findings worth preserving (the placeholder-stub correction, the `strip=true` reason `nm` shows 0 symbols, the per-binary feature gating, the workspace versioning model) and an uncommitted-files state worth recording for handoff.

This closes out the session. The committable docs (`docs/ARCHITECTURE.md`, the two `docs/diagrams/*.html`, and the two session-summary files) are staged in your working tree for whenever you want to commit them; `CLAUDE.local.md` stays local. Nothing was committed, per the repo's git rule.

### user · 2026-06-21 22:11:48

Great session. Now what I want to do is switch to our 'dev' branch and commit all of these files there, instead of on main. Can you assist me with that so that I don't lose any files in that process? And my dev branch is out of sync with main so we may want to do some syncing or merging there within this process, I really am unsure

### assistant · 2026-06-21 22:12:17

Git branch work with uncommitted files is exactly where things get lost, so let me investigate the real state first before touching anything — and per the repo rule, I won't run `git commit` myself; I'll get everything staged-and-ready and hand you the exact commands. Also worth noting: your memory flags a Parakeet WIP **stash** and a `parakeet-install-rewrite` branch on hold, so I'll check those aren't disturbed.

### assistant · 2026-06-21 22:13:19

Lots of important context here. Before anything: there are **more untracked files than just this session's work** (e.g. `AGENTS.override.md`, `PATHFINDER-2026-06-21/`, `docs/replay-*.md`, a `pathfinder-core-audit` summary), plus your Parakeet WIP stash is intact and untouched. Let me map the dev↔main divergence before proposing a plan.

### assistant · 2026-06-21 22:14:37

Now I have the full topology. Here's the situation before we touch anything:

**Branch divergence:** `dev` is **47 commits behind and 7 ahead** of `main` (common ancestor `a564cbd`, ~0.18.7-era).
- `dev`'s 7 unique commits are all **docs** (a parakeet rewrite, session summaries, catch-up commits).
- `main`'s 47 are the real feature/release work (0.18.8 → 0.18.14).
- ⚠️ Overlap risk: `dev` has `f69ffb7 docs(parakeet): rewrite install guide…` and `main` has the merged `8a45434 …(#250)` — **the same parakeet-doc work in two forms**, so a merge will likely conflict on `docs/PARAKEET.md`.
- `dev` == `origin/dev` (in sync), and all 4 of this session's target paths are **absent on dev** → switching is safe, no file loss.

Before I stage anything, let me ground the *other* untracked files (not from this session) so we know what we're deciding about.

### assistant · 2026-06-21 22:17:33

I now have everything mapped. Here's the full inventory of untracked files, sorted by origin:

**This session's deliverables (4):** `docs/ARCHITECTURE.md`, `docs/diagrams/minutes-build-link-run.html`, `docs/diagrams/minutes-parakeet-fallback.html`, `docs/session-summary-2026-06-21-architecture-deep-dive.md`

**From other work (not this session):**
- `AGENTS.override.md` — self-describes as a "Local Agent Override … for local agent coordination in this checkout" → it's the `AGENTS.md` analog of `CLAUDE.local.md`, i.e. meant to stay **local**, not committed.
- `PATHFINDER-2026-06-21/` + `docs/session-summary-2026-06-21-pathfinder-core-audit.md` — output of a separate Codex "pathfinder" audit.
- `docs/replay-17279b0b.md` (349 lines) + `docs/replay-17279b0b-full.md` (4,378 lines) — replay transcript dumps of this session.
- `docs/session-summary-2026-06-20-…md` — last session's summary.

Confirmed: **no modified tracked files** (only untracked), so switching to `dev` needs no stash and won't lose anything — git carries untracked files across the switch, and none of our paths exist on `dev`.

Two decisions are genuinely yours, and committing to a shared branch (`origin/dev` exists) is awkward to undo — so let me confirm scope and sync strategy rather than guess.

### assistant · 2026-06-21 22:20:45

Got it — committing this session's files **plus** the other doc artifacts (pathfinder audit, replays, prior summaries), **excluding** `AGENTS.override.md` (keeping it local like `CLAUDE.local.md`), and committing on `dev` now with **no merge** (sync later).

First, a safety check — confirm none of the files we're carrying over already exist as tracked files on `dev` (which would block the switch):

### assistant · 2026-06-21 22:21:44

All clear — every path is absent on `dev`, so the switch is clean. (And thanks for the context — that confirms the Pathfinder files are intentional Codex output you want included.) Executing the safe steps now: switch to dev, exclude `AGENTS.override.md` locally, stage the chosen files.

### assistant · 2026-06-21 22:23:26

Staging done. Note that switching to `dev` reverted the **tracked** files to dev's older state (dev is 47 commits behind, so its `CLAUDE.md`, `Cargo.toml`, etc. are older versions) — that's expected and correct, not a loss; main's newer versions are safe on `main`. Our untracked docs carried over intact and are staged. Let me verify the exact staged set before handing you the commit command:

### assistant · 2026-06-21 22:24:48

Everything is staged correctly and safely. Final state:

- **On branch `dev`** (in sync with `origin/dev`).
- **19 files staged** — this session's 4 (ARCHITECTURE.md + 2 diagrams + architecture summary), the full `PATHFINDER-2026-06-21/` audit (12 files incl. the `01-flowcharts/` set), both replay files, and the two prior session summaries.
- **`CLAUDE.local.md` and `AGENTS.override.md` excluded** ✓ (both confirmed ignored, won't be committed) — your local agent-override files stay local.
- **`main` is untouched** at `8a45434`, and its newer tracked files (the up-to-date `CLAUDE.md`, `Cargo.toml`, etc.) are safe there. On `dev` those tracked files show their older `dev` versions — expected, since dev is 47 behind; nothing was lost.
- Your **Parakeet WIP stash** (`stash@{0}`) and the `docs/parakeet-install-rewrite` branch are untouched.

Per the repo rule, I haven't committed — here's the ready-to-run command:

```bash
git commit -F - <<'EOF'
docs: add architecture reference, Pathfinder audit, and session artifacts

Documentation from two parallel agent sessions (no source changes):

- docs/ARCHITECTURE.md — grounded deep-dive on the three front-ends
  (CLI/Tauri/MCP) over minutes-core: coordination via ~/.minutes, the
  record/process async split, the pipeline, live/streaming, the Parakeet
  sidecar fallback chain, versioning, and per-binary compile-time features.
  Plus two interactive diagrams under docs/diagrams/.
- PATHFINDER-2026-06-21/ — Codex "Pathfinder" architecture audit: feature
  map, per-feature flowcharts, duplication report, unified proposal,
  handoff prompts, and final synthesized audit.
- docs/session-summary-* and docs/replay-* — session summaries and replay
  transcripts.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01TBqU7PBPbXfT8sRoi8md7z
EOF
```

Then to publish to your fork's dev:

```bash
git push origin dev
```

**When you're ready to sync later** (you chose to defer it): the merge will be `git switch dev && git merge main`, and expect one conflict on `docs/PARAKEET.md` (dev's `f69ffb7` vs main's `#250` — the same parakeet-doc work in two forms). Since main's `#250` is the merged/canonical version, resolving in favor of main's content is almost certainly right. Ping me and I'll walk it through with you.

Want me to verify the commit landed after you run it, or help with the push?

### user · 2026-06-21 22:28:13

_(invoked /copy)_

### user · 2026-06-21 23:00:47

I decided to break up the commits into smaller pieces and also add the work-in-progress versions of PARAKEET.md I had in stash so I now have them safely stored in a commit in `dev`. So now it is your turn to get your deep dive documents committed -- please scan the files I have staged and provide a proper commit message for them.

### assistant · 2026-06-21 23:00:51

I'll scan exactly what's currently staged and craft a commit message for that set.

### assistant · 2026-06-21 23:01:03

All this-session's deep-dive material — the Pathfinder audit and prior summaries are already in your separate commits (`314c727`, `39451fe`, `b028088`). One staged file I didn't create — `docs/codebase-assessment_2016-06-20.md` — let me peek so the message describes it accurately rather than guessing.

### assistant · 2026-06-21 23:01:31

Scanned. The staged set is exactly this session's deep-dive output (7 files, 6,156 insertions, all docs — your Pathfinder and Parakeet-stash work is already in the separate commits above). The one file I didn't author, `docs/codebase-assessment_2016-06-20.md`, is a concise 63-line mental-model assessment of the core-centric architecture — a companion to the full `ARCHITECTURE.md`, so it belongs in this commit.

One small heads-up before you commit: that filename reads **`2016`-06-20** — almost certainly a typo for `2026`. Want me to `git mv` it to `docs/codebase-assessment_2026-06-20.md` first? (Your call; the message below uses the current name.)

Commit message for the staged set:

```bash
git commit -F - <<'EOF'
docs: add CLI/Tauri/core architecture deep-dive + diagrams

Documentation from a learn-codebase deep dive (no source changes):

- docs/ARCHITECTURE.md — grounded reference on the three front-ends
  (CLI/Tauri/MCP) over minutes-core: coordination via ~/.minutes, the
  record/process async split, the pipeline, live/streaming, the Parakeet
  sidecar fallback chain, versioning, and per-binary compile-time features.
- docs/codebase-assessment_2016-06-20.md — concise mental-model summary of
  the shared core flow and the CLI/Tauri/MCP layers.
- docs/diagrams/minutes-build-link-run.html and
  docs/diagrams/minutes-parakeet-fallback.html — interactive companion diagrams.
- docs/session-summary-2026-06-21-architecture-deep-dive.md plus
  docs/replay-17279b0b.md and docs/replay-17279b0b-full.md — session summary
  and replay transcripts.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01TBqU7PBPbXfT8sRoi8md7z
EOF
```

After committing, `dev` will be **4 ahead** of `origin/dev`; push with `git push origin dev` when ready. Want me to rename the mistyped file first, or verify the commit once you've run it?

### user · 2026-06-21 23:02:15

_(invoked /copy)_

### user · 2026-06-21 23:09:52

<bash-input>git log --name-status -5</bash-input>

### user · 2026-06-21 23:09:52

<bash-stdout>commit bd4b9d6abff2bfae03f3f9d40cb488da61f70ed7
Author: Ryan Malia &lt;ryanmalia@gmail.com&gt;
Date:   Sun Jun 21 16:08:04 2026 -0700

    docs: add CLI/Tauri/core architecture deep-dive + diagrams
    
    Documentation from a learn-codebase deep dive (no source changes):
    
    - docs/ARCHITECTURE.md — grounded reference on the three front-ends
      (CLI/Tauri/MCP) over minutes-core: coordination via ~/.minutes, the
      record/process async split, the pipeline, live/streaming, the Parakeet
      sidecar fallback chain, versioning, and per-binary compile-time features.
    - docs/codebase-assessment_2016-06-20.md — concise mental-model summary of
      the shared core flow and the CLI/Tauri/MCP layers.
    - docs/diagrams/minutes-build-link-run.html and
      docs/diagrams/minutes-parakeet-fallback.html — interactive companion diagrams.
    - docs/session-summary-2026-06-21-architecture-deep-dive.md plus
      docs/replay-17279b0b.md and docs/replay-17279b0b-full.md — session summary
      and replay transcripts used for intra-agent communication.

A	docs/ARCHITECTURE.md
A	docs/diagrams/minutes-build-link-run.html
A	docs/diagrams/minutes-parakeet-fallback.html
A	docs/replay-17279b0b-full.md
A	docs/replay-17279b0b.md
A	docs/session-summary-2026-06-21-architecture-deep-dive.md

commit b92d6d3b94561985cff9af92153daff0b87a56ba
Author: Ryan Malia &lt;ryanmalia@gmail.com&gt;
Date:   Sun Jun 21 16:06:22 2026 -0700

    docs: add source-verified Pathfinder architecture audit
    
    Add the June 21 Pathfinder audit artifacts for the Minutes runtime
    architecture and synchronize the duplication report, unified proposal,
    and handoff prompts with the final source-verified assessment.
    
    Key points captured:
    - clarify that CLI and Tauri link minutes-core directly, while MCP is a
      CLI bridge with TypeScript read-only fallbacks
    - document start-only desktop-control and CLI-backed stop semantics
    - identify watcher/job orchestration drift and graph/search corpus drift
    - add desktop update readiness as a Tauri-local cleanup target
    - preserve desktop-native call capture, Recall, foreground process, and
      specialized retrieval stores as intentional boundaries
    
    Also add the session summary for the Pathfinder audit work.

A	PATHFINDER-2026-06-21/00-features.md
A	PATHFINDER-2026-06-21/01-flowcharts/desktop-shell.md
A	PATHFINDER-2026-06-21/01-flowcharts/live-dictation.md
A	PATHFINDER-2026-06-21/01-flowcharts/mcp-agent-surface.md
A	PATHFINDER-2026-06-21/01-flowcharts/processing-jobs-watcher.md
A	PATHFINDER-2026-06-21/01-flowcharts/recording-capture.md
A	PATHFINDER-2026-06-21/01-flowcharts/search-graph-knowledge.md
A	PATHFINDER-2026-06-21/02-duplication-report.md
A	PATHFINDER-2026-06-21/03-unified-proposal.md
A	PATHFINDER-2026-06-21/04-handoff-prompts.md
A	PATHFINDER-2026-06-21/05-final-synthesized-audit.md
A	docs/codebase-assessment_2026-06-20.md
A	docs/session-summary-2026-06-21-pathfinder-core-audit.md

commit 39451fe32ca4ae66ed1cb75a10430e38cf5da76a
Author: Ryan Malia &lt;ryanmalia@gmail.com&gt;
Date:   Sun Jun 21 15:56:35 2026 -0700

    docs: the stash of in-progress versions of PARAKEET.md for PR #250
    
    PARAKEET_ryan.md being the version furthest-along
    in the direction I want to take
    
    docs/PARAKEET_claude.md
    docs/PARAKEET_claude2.md
    docs/PARAKEET_claude2_claude1_merge.md
    docs/PARAKEET_claude2_claude2_merge.md
    docs/PARAKEET_claude2_codex1.md
    docs/PARAKEET_claude2_codex2.md
    docs/PARAKEET_codex.md
    docs/PARAKEET_codex2.md
    docs/PARAKEET_ryBAK_2026-06-11.md
    docs/PARAKEET_ryan.md
    docs/PARAKEET_staged_2026-06-15.md
    docs/PARAKEET_vDev_2026-05-22.md
    docs/PARAKEET_vPR_2026-05-15.md
    docs/PARAKEET_vUpstream_2026-05-13.md

A	docs/PARAKEET_claude.md
A	docs/PARAKEET_claude2.md
A	docs/PARAKEET_claude2_claude1_merge.md
A	docs/PARAKEET_claude2_claude2_merge.md
A	docs/PARAKEET_claude2_codex1.md
A	docs/PARAKEET_claude2_codex2.md
A	docs/PARAKEET_codex.md
A	docs/PARAKEET_codex2.md
A	docs/PARAKEET_ryBAK_2026-06-11.md
A	docs/PARAKEET_ryan.md
A	docs/PARAKEET_staged_2026-06-15.md
A	docs/PARAKEET_vDev_2026-05-22.md
A	docs/PARAKEET_vPR_2026-05-15.md
A	docs/PARAKEET_vUpstream_2026-05-13.md
A	docs/session-summary-2026-06-20-stash-main-sync-parakeet-backup.md

commit b02808891201a04364975dcdd53a03b382b3c4be
Author: Ryan Malia &lt;ryanmalia@gmail.com&gt;
Date:   Sun Jun 21 15:42:09 2026 -0700

    docs: session summary from parakeet PR #250 docs/parakeet-install-rewrite

A	docs/session-summary-2026-06-11-parakeet-cmake-numpy-dogfood.md

commit f041c9f696079a4650b2090255b2b320bc3d19da
Merge: 57756b5 a564cbd
Author: Ryan &lt;ryanmalia@gmail.com&gt;
Date:   Tue Jun 9 09:35:19 2026 -0700

    Merge branch 'silverstein:main' into dev</bash-stdout><bash-stderr></bash-stderr>

### user · 2026-06-21 23:09:59

All done with the commits

### assistant · 2026-06-21 23:10:22

All set — nice clean breakup of the commits. From your log, everything landed where it should:

- **`bd4b9d6`** — the architecture deep-dive docs (ARCHITECTURE.md, both diagrams, session summary, replays).
- **`b92d6d3`** — the Pathfinder audit, and I see you folded `docs/codebase-assessment_2026-06-20.md` in there with the year typo fixed (2016 → 2026). 👍
- **`39451fe`** — the 14 PARAKEET.md WIP drafts out of the stash, safely in history now.

Two optional follow-ups whenever you want them (no rush, nothing's blocking):

1. **Push** — `dev` is ahead of `origin/dev` by your new commits; `git push origin dev` publishes them.
2. **The deferred main→dev sync** — `dev` is still 47 behind `main`. When you're ready, `git switch dev && git merge main`, expecting the one `docs/PARAKEET.md` conflict (dev's `f69ffb7` vs main's `#250`) — resolve toward main's canonical version. Ping me and I'll walk it through.

Your Parakeet WIP stash and `docs/parakeet-install-rewrite` branch remain untouched throughout. Good session — the deep dive is now durable in `dev` and in memory for next time.

### user · 2026-06-21 23:13:08

So when I do the merge of main onto dev, is `docs/PARAKEET` expected to be the only conflict?

### assistant · 2026-06-21 23:13:23

Good instinct not to take my word for it — let me actually compute it rather than assume. `git merge-tree` performs a real in-memory merge without touching your working tree, so it predicts the exact conflict set.

### assistant · 2026-06-21 23:13:53

Good that you asked — I need to correct what I told you earlier. **No, `docs/PARAKEET.md` is not the only conflict.** The authoritative in-memory merge shows **two** conflicts:

| Conflicted file | Why |
|-----------------|-----|
| `docs/PARAKEET.md` | dev's `f69ffb7` vs main's `#250` — same parakeet-doc rewrite, two forms |
| `README.md` | changed on **both** sides since the common ancestor |

The logic is clean: the only files that *can* conflict are those changed on **both** branches since the merge-base (`a564cbd`). That intersection is exactly those two files — everything else dev added (ARCHITECTURE.md, the PATHFINDER set, all the PARAKEET_*.md drafts, the session summaries) is dev-only and merges cleanly, and main's 47 commits touch source files dev never changed, so they come in cleanly too. `merge-tree` confirms both are *content* conflicts git can't auto-resolve.

I should have computed this the first time instead of asserting "one conflict" — my earlier statement was a guess, not verified.

Let me characterize the README conflict so the resolution is planned, not a surprise:

### assistant · 2026-06-21 23:14:31

Both conflicts are in the **same area** — parakeet documentation — which makes them straightforward to reason about:

**`README.md`** — both sides edited the parakeet-setup block:
- **dev** (+7/−3): your small clarification that `minutes setup --parakeet` installs Silero VAD weights but the `.nemo` download + `convert_nemo.py` step is still manual (~2.3 GB result).
- **main** (+56/−4): a much larger rewrite of the same region (part of the `#250` "fix verified gotchas" work).

**`docs/PARAKEET.md`** — the same `#250` rewrite vs your dev `f69ffb7` version.

So the pattern is: **main carries the canonical, merged versions of the parakeet docs; dev carries your earlier in-progress versions of the same content.**

**Suggested resolution when you do the merge:**
- `docs/PARAKEET.md` → take **main's** version wholesale (`#250` is the canonical, reviewed rewrite). `git checkout --theirs docs/PARAKEET.md`.
- `README.md` → take **main's** as the base, then verify your dev-specific clarifications (the manual `.nemo`/`convert_nemo.py` note, the ~2.3 GB figure) actually survived in main's rewrite — graft them in if main dropped them. This one deserves a real look rather than blind `--theirs`, since your edit added a specific gotcha.

Net: **2 conflicts, both parakeet-doc, both shallow.** When you're ready I can run `git merge main`, then walk both files with you side-by-side and resolve — and per the repo rule I'll stage the resolution and hand you the final `git commit` rather than committing the merge myself.

And noted for myself: I should have run `merge-tree` before claiming "one conflict" the first time — verifying beat guessing again.

### user · 2026-06-21 23:15:22

go ahead and run the merge

### assistant · 2026-06-21 23:15:35

On it. First confirming a clean tree, then running the merge (it'll stop at the conflicts without committing).

### assistant · 2026-06-21 23:16:14

Both predicted conflicts, exactly as computed. Resolving `docs/PARAKEET.md` toward main (canonical `#250`), then inspecting the README conflict in detail:

### assistant · 2026-06-21 23:16:57

The README conflict is genuinely tiny — main's larger rewrite auto-merged everywhere except **one line**, and even there your dev version is identical to main's except a version pin:

- dev (HEAD): `# … still manual in v0.18.0.`
- main: `# … still manual.`

main deliberately dropped the version pin (it goes stale), and main is canonical — so I'll keep main's line. Resolving surgically so the change is transparent:

### assistant · 2026-06-21 23:17:07

README resolved. Now staging it and verifying no conflict markers remain anywhere before handing off:

### assistant · 2026-06-21 23:18:13

Both conflicts resolved cleanly — no markers remain, no unmerged paths. The merge is fully staged and ready to commit.

**About that long staged file list:** don't be alarmed — that's main's 47 commits of real work now integrating into `dev` (the whole point of the merge). Here's the key safety fact: **`dev` had zero source-code changes** (its 7 commits were all docs), so for every `.rs`/`.ts`/source file the merge simply takes main's exact, already-tested version — there's no line-level interleaving of code to introduce a broken combination. The only files I manually resolved were the two docs conflicts:

| File | Resolution |
|------|-----------|
| `docs/PARAKEET.md` | took main's canonical `#250` version (`--theirs`) |
| `README.md` | kept main's line (dropped the stale `in v0.18.0` version pin); rest auto-merged |

Because my only hand-edits were docs and all code equals main's green tree, no rebuild/lint is needed for *this* merge.

Per the repo rule, I won't run the commit — complete the merge with either:

```bash
# simplest — uses the standard "Merge branch 'main' into dev" message
git commit --no-edit
```

or, if you'd like the resolution documented in history:

```bash
git commit -F - <<'EOF'
Merge branch 'main' into dev

Bring dev up to date with main (0.18.7 → 0.18.14). dev's only unique
work was docs, so all source files take main's versions cleanly.

Conflicts (both docs, resolved toward main as canonical):
- docs/PARAKEET.md — took main's #250 install-guide rewrite
- README.md — kept main's parakeet-setup wording (dropped stale "in v0.18.0" pin)
EOF
```

After committing, `dev` will be even with `main` plus your dev-only doc commits; publish with `git push origin dev`.

Want me to verify the result once you've committed (confirm `dev` contains all of main's commits and the tree is clean)?

### user · 2026-06-21 23:19:04

<bash-input>git commit -F - <<'EOF'
Merge branch 'main' into dev

Bring dev up to date with main (0.18.7 → 0.18.14). dev's only unique
work was docs, so all source files take main's versions cleanly.

Conflicts (both docs, resolved toward main as canonical):
- docs/PARAKEET.md — took main's #250 install-guide rewrite
- README.md — kept main's parakeet-setup wording (dropped stale "in v0.18.0" pin)
EOF
</bash-input>

### user · 2026-06-21 23:19:04

<bash-stdout>[dev a50561f] Merge branch 'main' into dev</bash-stdout><bash-stderr></bash-stderr>

### user · 2026-06-21 23:19:42

double-check that please

### assistant · 2026-06-21 23:20:14

Verified — the merge is clean and complete. All checks pass:

| Check | Result |
|-------|--------|
| HEAD | `a50561f Merge branch 'main' into dev` |
| **dev contains all of main** | `dev..main` = **0 commits** ✓ — nothing from main is missing |
| Divergence | `0` left / `12` right — main has nothing dev lacks; dev is ahead by your doc commits + the merge ✓ |
| Working tree | clean ✓ |
| Conflict markers | none (outside the replay transcripts, which legitimately contain `=======` as markdown) ✓ |
| `docs/PARAKEET.md` | byte-identical to main's canonical version ✓ |
| `README.md` | main's wording kept (`…still manual.`, stale version pin gone) ✓ |
| Parakeet WIP stash | `stash@{0}` intact, untouched ✓ |

So `dev` is now **fully caught up with `main` (0.18.14)** and carries your doc work on top — exactly the goal. The earlier 47-behind gap is closed.

**One thing left:** `dev` is **48 commits ahead of `origin/dev`** (all unpushed — main's 47 + your local commits + the merge). To publish:

```bash
git push origin dev
```

That's a normal fast-forward push to your fork; nothing force-related, nothing risky. Want me to stand by and confirm once you've pushed?

### user · 2026-06-21 23:20:32

<bash-input>git push origin dev</bash-input>

### user · 2026-06-21 23:20:33

<bash-stdout>To https://github.com/rymalia/minutes.git
   bd4b9d6..a50561f  dev -&gt; dev</bash-stdout><bash-stderr></bash-stderr>

### user · 2026-06-21 23:21:23

Looks good

### assistant · 2026-06-21 23:21:34

Pushed cleanly — `origin/dev` now points at `a50561f` (fast-forward `bd4b9d6..a50561f`, no force). Everything is published and consistent.

Final state:

- **`dev` (local + `origin/dev`)** — in sync, fully caught up with `main` (0.18.14) plus your doc work: the architecture deep-dive, the Pathfinder audit, the PARAKEET.md draft stash, and session summaries.
- **`main`** — untouched throughout this whole operation.
- **Local-only, never committed** — `CLAUDE.local.md` and `AGENTS.override.md` (both git-excluded).
- **Parakeet WIP stash** (`stash@{0}`) and `docs/parakeet-install-rewrite` branch — intact, untouched.

Nothing was lost at any step, which was the original concern. Good session all around — the deep-dive docs are now durable in `dev`, the merge is verified, and it's all on your fork.

### user · 2026-06-21 23:22:48

Instead of Updating the session summary to note the dev merge and push, can you just create a new session summary doc, a rather slim one, just recapping what git gymnastics we've just completed here, for documentation sake

### assistant · 2026-06-21 23:23:03

Slim recap doc it is. Let me grab the exact timestamp and commit hashes so it's accurate, then write it.

### assistant · 2026-06-21 23:23:34

Created **`docs/session-summary-2026-06-21-dev-branch-sync.md`** — a slim, git-only recap that complements (rather than edits) the architecture deep-dive summary. It covers just the branch gymnastics: the dev switch, the piecewise commits, the predicted-then-resolved merge, and the push — plus the verified end state and a couple of reusable gotchas (`merge-tree` for conflict prediction, untracked-files-survive-switch).

It's currently untracked on `dev`. If you want it in history too, the staging + message:

```bash
git add docs/session-summary-2026-06-21-dev-branch-sync.md
git commit -F - <<'EOF'
docs: session summary for dev branch sync & doc commits

Git recap of moving the architecture deep-dive + Pathfinder audit docs
onto dev and merging main into dev (0.18.7 → 0.18.14).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01TBqU7PBPbXfT8sRoi8md7z
EOF
git push origin dev
```

That's the whole git episode documented. Anything else you want captured before we wrap?

### user · 2026-06-21 23:24:17

_(invoked /copy)_
