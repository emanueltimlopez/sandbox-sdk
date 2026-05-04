import { SSDK } from "../../index.ts";

const sdk = new SSDK();

const prompt = process.argv.slice(2).join(" ").trim();
const runId = Date.now();

if (!prompt) {
  throw new Error(
    "Pass one prompt to run in both sandboxes: bun run examples/multiple-agents/run.ts \"change the app title\"",
  );
}

const agents = [
  {
    name: "codex",
    projectPath: "examples/multiple-agents/codex",
    imageTag: "sandbox-agent-codex:latest",
    containerName: `sandbox-agent-codex-${runId}`,
    env: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      PROMPT: prompt,
    },
  },
  {
    name: "claude-code",
    projectPath: "examples/multiple-agents/claude-code",
    imageTag: "sandbox-agent-claude-code:latest",
    containerName: `sandbox-agent-claude-code-${runId}`,
    env: {
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      PROMPT: prompt,
    },
  },
] as const;

const runAgent = async (agent: (typeof agents)[number]) => {
  const missingEnv = Object.entries(agent.env)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingEnv.length > 0) {
    throw new Error(`[${agent.name}] Missing env: ${missingEnv.join(", ")}`);
  }

  await sdk.buildImage(agent.projectPath, agent.imageTag);

  const container = await sdk.createAndRunContainer(
    agent.imageTag,
    agent.containerName,
    { env: agent.env },
  );

  console.log(`[${agent.name}] container ${container.id}`);

  const logs = await sdk.getContainerLogs(container);
  logs.on("data", (chunk) => {
    process.stdout.write(`[${agent.name}] ${chunk.toString()}`);
  });

  try {
    const result = await container.wait();
    console.log(`[${agent.name}] exited with status ${result.StatusCode}`);
  } finally {
    await sdk.removeContainer(container);
  }
};

await Promise.all(agents.map(runAgent));
