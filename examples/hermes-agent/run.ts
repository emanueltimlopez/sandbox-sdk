import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { SSDK } from "../../index.ts";

const sdk = new SSDK();

const projectPath = "examples/hermes-agent";
const imageTag = "sandbox-agent-hermes:latest";
const runId = Date.now();
const mode = process.argv[2] ?? "chat";
const modeArgs = process.argv.slice(3);
const prompt = modeArgs.join(" ").trim();
const dataPath = resolve("examples/.hermes-data");

const providerEnv = {
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
};

const runContainer = async (cmd: string[], options = {}) => {
  await mkdir(dataPath, { recursive: true });
  await sdk.buildImage(projectPath, imageTag);

  const container = await sdk.createAndRunContainer(
    imageTag,
    `sandbox-agent-hermes-${mode}-${runId}`,
    {
      ...options,
      cmd,
      env: {
        ...providerEnv,
        API_SERVER_ENABLED: process.env.API_SERVER_ENABLED,
        API_SERVER_HOST: process.env.API_SERVER_HOST,
        API_SERVER_KEY: process.env.API_SERVER_KEY,
      },
      binds: [`${dataPath}:/opt/data`],
    },
  );

  console.log(`[hermes] container ${container.id}`);
  console.log(`[hermes] data ${dataPath}`);

  const logs = await sdk.getContainerLogs(container);
  logs.on("data", (chunk) => {
    process.stdout.write(`[hermes] ${chunk.toString()}`);
  });

  return container;
};

const waitAndRemove = async (container: Awaited<ReturnType<typeof runContainer>>) => {
  try {
    const result = await container.wait();
    console.log(`[hermes] exited with status ${result.StatusCode}`);
  } finally {
    await sdk.removeContainer(container);
  }
};

if (mode === "gateway") {
  const container = await runContainer(["gateway", "run"], {
    ports: { "8642/tcp": process.env.HERMES_GATEWAY_PORT ?? "8642" },
  });
  let cleanedUp = false;
  const cleanup = async () => {
    if (cleanedUp) {
      return;
    }
    cleanedUp = true;
    await sdk.stopContainer(container).catch(() => undefined);
    await sdk.removeContainer(container).catch(() => undefined);
  };

  process.once("SIGINT", () => {
    cleanup()
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        process.exit(130);
      });
  });

  console.log(
    `[hermes] gateway listening on http://localhost:${process.env.HERMES_GATEWAY_PORT ?? "8642"}`,
  );
  console.log("[hermes] stop with Ctrl+C");

  try {
    await container.wait();
  } finally {
    await cleanup();
  }
} else if (mode === "config") {
  if (modeArgs.length === 0) {
    throw new Error(
      'Pass config args: bun run examples/hermes-agent/run.ts config show',
    );
  }

  await waitAndRemove(await runContainer(["config", ...modeArgs]));
} else if (mode === "chat") {
  if (!prompt) {
    throw new Error(
      'Pass a prompt: bun run examples/hermes-agent/run.ts chat "Hello Hermes"',
    );
  }

  const container = await runContainer(["chat", "-q", prompt]);
  await waitAndRemove(container);
} else {
  throw new Error(`Unknown mode "${mode}". Use "chat", "config", or "gateway".`);
}
