import Docker from "dockerode";
import { readdir, writeFile } from "node:fs/promises";
import { relative, sep } from "node:path";

export type InitProjectResult = {
  success: true;
  path: string;
};

export type BuildImageResult = {
  success: true;
  tag: string;
};

export class SSDK {
  private docker: Docker;

  constructor() {
    this.docker = new Docker();
  }

  async initProject(projectPath: string): Promise<InitProjectResult> {
    const template = this.getTemplate();
    const path = `${projectPath}/Dockerfile`;
    await writeFile(path, template);
    return { success: true, path };
  }

  async buildImage(projectPath: string, tag: string): Promise<BuildImageResult> {
    const stream = await this.docker.buildImage(
      {
        context: projectPath,
        src: await this.getBuildContextFiles(projectPath),
      },
      { t: tag },
    );

    await new Promise<void>((resolve, reject) => {
      this.docker.modem.followProgress(stream, (error, output) => {
        if (error) {
          reject(error);
          return;
        }

        const buildError = output.find((event) => "error" in event);
        if (buildError && "error" in buildError) {
          reject(new Error(buildError.error));
          return;
        }

        resolve();
      });
    });

    return { success: true, tag };
  }

  async createAndRunContainer(
    image: string,
    name: string,
  ): Promise<Docker.Container> {
    const container = await this.docker.createContainer({
      Image: image,
      name: name,
      Tty: true,
    });
    await container.start();
    return container;
  }

  async stopContainer(container: Docker.Container): Promise<void> {
    await container.stop();
  }

  async removeContainer(container: Docker.Container): Promise<void> {
    await container.remove();
  }

  async restartContainer(container: Docker.Container): Promise<void> {
    await container.restart();
  }

  async getContainerLogs(
    container: Docker.Container,
  ): Promise<NodeJS.ReadableStream> {
    return container.logs({ stdout: true, stderr: false, follow: true });
  }

  private getTemplate(): string {
    return `FROM oven/bun:latest\nWORKDIR /app\nCOPY . .\nRUN bun install\nCMD ["bun", "run", "index.ts"]`;
  }

  private async getBuildContextFiles(projectPath: string): Promise<string[]> {
    const ignoredDirectories = new Set([".git", "node_modules"]);
    const files: string[] = [];

    const walk = async (directory: string) => {
      const entries = await readdir(directory, { withFileTypes: true });

      for (const entry of entries) {
        const entryPath = `${directory}/${entry.name}`;

        if (entry.isDirectory()) {
          if (!ignoredDirectories.has(entry.name)) {
            await walk(entryPath);
          }
          continue;
        }

        if (entry.isFile()) {
          files.push(relative(projectPath, entryPath).split(sep).join("/"));
        }
      }
    };

    await walk(projectPath);
    return files;
  }
}
