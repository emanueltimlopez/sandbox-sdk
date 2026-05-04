FROM node:22-bookworm-slim

WORKDIR /workspace

RUN npm install -g @anthropic-ai/claude-code

CMD ["sh", "-lc", "claude -p \"$PROMPT\" "]
