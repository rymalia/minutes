# Contributing to Minutes

Thanks for your interest in contributing to Minutes!

## Quick Start

```bash
git clone https://github.com/silverstein/minutes.git
cd minutes
cargo build
cargo test
```

### Prerequisites

- **Rust** (latest stable)
- **cmake** (`brew install cmake`)
- **Python 3** (for diarization via pyannote, optional)

### macOS SDK Note

On macOS 26 (Tahoe), you may need to set C++ include paths for whisper.cpp compilation:

```bash
export CXXFLAGS="-I$(xcrun --show-sdk-path)/usr/include/c++/v1"
```

### Running Tests

```bash
# Fast tests (no whisper model needed)
cargo test -p minutes-core --no-default-features

# Full tests (requires whisper model)
minutes setup --model tiny
cargo test
```

## Architecture

```
crates/core/src/    # Library — all logic lives here
  capture.rs        # Audio capture (cpal)
  transcribe.rs     # Whisper.cpp + symphonia format conversion
  diarize.rs        # Pyannote subprocess
  summarize.rs      # LLM summarization (Claude/OpenAI/Ollama)
  pipeline.rs       # Orchestrates the pipeline
  watch.rs          # Folder watcher
  markdown.rs       # Output writer
  search.rs         # Walk-dir search
  config.rs         # TOML config with defaults
  pid.rs            # PID file lifecycle
  logging.rs        # Structured JSON logging
  error.rs          # Per-module error types

crates/cli/         # CLI binary — thin wrapper
crates/mcp/         # MCP server for Claude Desktop
tauri/              # Menu bar app (Tauri v2)
```

The key design: `minutes-core` is a library crate shared by the CLI, MCP server, and Tauri app. All logic goes in core. The other crates are thin wrappers.

## Adding a Feature

1. Implement in `crates/core/src/`
2. Add error types to the module's error enum
3. Write unit tests in the same file
4. Wire into the CLI if user-facing
5. Run `cargo test && cargo clippy -- -D warnings && cargo fmt --check`

## Code Style

- `cargo fmt` for formatting
- `cargo clippy -- -D warnings` must pass
- Per-module error enums (not `anyhow` in the library)
- File permissions `0600` on all meeting output
- Explicit > clever

## License

MIT — see [LICENSE](LICENSE).
