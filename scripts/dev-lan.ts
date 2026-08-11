import { spawn } from "node:child_process";
import { networkInterfaces } from "node:os";

function firstLanAddress(): string | undefined {
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === "IPv4" && !address.internal) {
        return address.address;
      }
    }
  }
  return undefined;
}

const lanAddress = firstLanAddress();
if (!lanAddress) {
  process.stderr.write(
    "No non-internal IPv4 network interface was found; connect to a network first.\n",
  );
  process.exit(1);
}

const port = process.env.PORT ?? "3000";
const appUrl = `http://${lanAddress}:${port}`;
process.stdout.write(
  `Starting dev server for LAN access. Open ${appUrl}/vi or ${appUrl}/en from another device on the same network.\n`,
);

const child = spawn("npm", ["run", "dev"], {
  stdio: "inherit",
  env: { ...process.env, APP_URL: appUrl },
});

child.on("exit", (code) => process.exit(code ?? 0));
