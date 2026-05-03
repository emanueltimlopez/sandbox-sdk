import { SSDK } from "..";

const sdk = new SSDK();

const path = "./test";

const main = async () => {
  await sdk.initProject(path);
  await sdk.buildImage(path, "demo:latest");
  const container = await sdk.createAndRunContainer(
    "demo:latest",
    "instance-1",
  );
  console.log(container.id);
  const logs = await sdk.getContainerLogs(container);
  logs.pipe(process.stdout);
  await container.wait();
  await sdk.removeContainer(container);
};

main();
