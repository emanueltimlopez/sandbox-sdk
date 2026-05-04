# Multiple Agents

Runs the same prompt in two isolated Docker sandboxes: one with Codex and one with Claude Code.

Each agent has its own Docker image, container, filesystem, and credentials. The shared prompt is passed through the `PROMPT` environment variable.

## Requirements

- Docker installed and running
- `OPENAI_API_KEY` for the Codex sandbox
- `ANTHROPIC_API_KEY` for the Claude Code sandbox
- Bun or another TypeScript runner that can execute `run.ts`

## Run

```bash
OPENAI_API_KEY=... ANTHROPIC_API_KEY=... \
  bun run examples/multiple-agents/run.ts "Inspect the project and suggest one small improvement"
```

The example builds both images, starts both containers in parallel, prefixes each log line with the agent name, waits for both to finish, and removes the containers.
