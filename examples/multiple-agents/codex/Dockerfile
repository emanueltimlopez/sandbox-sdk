FROM node:22-bookworm-slim

WORKDIR /workspace

RUN npm install -g @openai/codex

CMD ["sh", "-lc", "codex exec --full-auto \"$PROMPT\""]
