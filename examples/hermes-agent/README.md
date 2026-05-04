# Hermes Agent

Runs Hermes Agent in a Docker-backed sandbox using the official `nousresearch/hermes-agent` image.

The example keeps Hermes state outside the image in `examples/.hermes-data`, mounted as `/opt/data` inside the container. That directory stores Hermes config, sessions, memory, skills, and provider credentials.

## Requirements

- Docker installed and running
- Bun or another TypeScript runner that can execute `run.ts`
- At least one provider key, such as `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, or `ANTHROPIC_API_KEY`

## One-shot chat

```bash
OPENROUTER_API_KEY=... \
  bun run examples/hermes-agent/run.ts chat "Inspect the current working directory"
```

This builds the local wrapper image, runs `hermes chat -q`, streams logs, waits for completion, and removes the container.

## Configure Hermes

Run `hermes config` commands through the same sandbox and persistent data directory:

```bash
bun run examples/hermes-agent/run.ts config show
bun run examples/hermes-agent/run.ts config set model anthropic/claude-sonnet-4
bun run examples/hermes-agent/run.ts config set OPENROUTER_API_KEY sk-or-...
bun run examples/hermes-agent/run.ts config check
```

Hermes stores non-secret values in `config.yaml` and secrets such as API keys in `.env` under the mounted `examples/.hermes-data` directory.

## Gateway mode

```bash
OPENROUTER_API_KEY=... API_SERVER_ENABLED=true API_SERVER_KEY=dev-key \
  bun run examples/hermes-agent/run.ts gateway
```

The gateway publishes container port `8642` to host port `8642` by default. Override the host port with:

```bash
HERMES_GATEWAY_PORT=8643 \
  OPENROUTER_API_KEY=... API_SERVER_ENABLED=true API_SERVER_KEY=dev-key \
  bun run examples/hermes-agent/run.ts gateway
```

The gateway is long-running. Stop it with `Ctrl+C`; if the process is interrupted before cleanup, remove the container with Docker.
