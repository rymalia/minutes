# v0.12.1: Frontmatter polish, Parakeet hardening, and LLM titles

## What changed

This release is a focused polish pass over the work that landed in v0.12.0. The transcription pipeline was doing a lot — transcribe, diarize, summarize, extract entities, match calendar events, write markdown — and the seams between those steps were leaking. Speaker labels from diarization were ending up in attendee lists, email addresses from calendars were spawning duplicate people, and "Untitled Recording" was the title more often than anyone was willing to admit.

v0.12.1 closes those seams.

## Frontmatter polish

The biggest visible change is that meeting frontmatter now reflects real humans instead of pipeline artifacts.

- Speaker labels like `SPEAKER_1`, `Speaker_1 (Name)`, and `Name (speaker_1)` no longer leak into `attendees`, `people`, `entities.people`, or `action_items[].assignee`. They get resolved to names via the speaker map, or stripped if the confidence was too low.
- Calendar email addresses now fold onto the matching person entity instead of spawning their own. A calendar attendee like `alex@example.com` becomes an alias of the existing `Alex` entity instead of producing a separate `alex-example-com` slug.
- `/`-disambiguated hedges like `Alex / Alexander` collapse to the canonical head (`Alex`) in both `attendees` and `entities.people`, and the full form is preserved as an alias.
- Decision topics no longer read `speaker 1 provide speaker`. They get normalized through the speaker map before topic derivation.
- Project slugs reject task-like verb starts (`pioneer-asked-build`, `reach-out`) while still preserving legitimate noun phrases (`Review Board`, `Study Group`).

## New: `[identity]` config for multi-email humans

Most users have more than one email address — work, personal, consulting — and the same human shows up under different ones across different calendars. v0.12.1 adds `emails` and `aliases` under `[identity]` so Minutes can recognize you across all of them.

```toml
[identity]
name = "Mat"
emails = [
    "mat@work.com",
    "mat@personal.com",
    "mat@consulting.co",
]
aliases = ["Mathieu", "Matthew"]
```

Everything listed here folds onto the `Mat` entity instead of spawning duplicates in `entities.people` or `graph.db`. Your legacy `email = "..."` field still works.

## LLM-driven title refinement

"Untitled Recording" is no longer the default. After summarization, a lightweight LLM title pass looks at the summary and proposes a real title like `Command RX PBM Reconciliation and 835 File Access Planning`. The pipeline logs both the LLM duration and the filename-rename time separately so it's obvious which step is slow when one of them is.

## Parakeet hardening

The opt-in Parakeet path introduced in v0.12.0 got a lot of work too.

- Binary auto-resolution searches `/opt/homebrew/bin`, `/usr/local/bin`, and `~/.local/bin` if `parakeet_binary` is unset, and logs which candidate it picked on every resolution.
- The binary health check no longer probes with `--version` (which exits non-zero on most Parakeet builds); it now checks that the file exists and is executable.
- `parakeet_fp16` now defaults to `true` on Apple Silicon, matching the measured ~35% faster transcription with lower GPU memory.
- Optional warm sidecar (`parakeet_sidecar_enabled = true`) reuses a single Parakeet process across chunks for lower per-chunk latency. Falls back to subprocess on crash.

## Observability

Every pipeline stage now emits a structured JSON log line with `step`, `duration_ms`, and step-specific `extra` metadata:

- `transcribe`, `summarize`, `entity_extract`, `action_items`, `intent_extract`, `speaker_mapping`, `title_generation`, `attribution`, `write`, `pipeline_complete`

Useful for debugging slow pipelines and for the upcoming dashboard integrations.

## Calendar + EventKit

Meeting processing now passes the recording's actual timestamp to EventKit when looking for a matching calendar event, so delayed processing (voice memos from yesterday, old recordings reprocessed) matches the right event instead of whatever is happening right now. No more AppleScript fallback being triggered unnecessarily.

## Tauri auto-update UX

The macOS desktop app's auto-updater gains a real state machine: checking, downloading, verifying, installing, ready, and error phases are all surfaced to the UI, along with progress percentage, ETA, and a cancel affordance.

## Misc

- Arc browser added to Google Meet call detection
- `XDG_CONFIG_HOME` is now honored when locating `config.toml`
- Cross-platform `parakeet` feature build added to the main CI matrix so Linux regressions surface before tag push, not after
- Meeting prompt titles no longer double-escape when URL-encoded

## Install

**CLI only:**
```bash
brew install silverstein/tap/minutes
# or
cargo install minutes-cli
```

**MCP server (zero-install):**
```bash
npx minutes-mcp@latest
```

**Desktop app:** download the DMG from [useminutes.app](https://useminutes.app).

**Claude Desktop:** grab `minutes.mcpb` from this release and drag it into Claude Desktop's Extensions settings.
