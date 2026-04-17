import { copyFileSync, cpSync, existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const standaloneDir = join(root, ".next", "standalone");
const staticDir = join(root, ".next", "static");
const deployDir = join(root, "deploy", "dreamhost");
const deployNextDir = join(deployDir, ".next");
const deployStaticDir = join(deployNextDir, "static");
const deployStandaloneServer = join(deployDir, "server.standalone.js");
const deployWrapperServer = join(root, "server.js");
const deployHtaccess = join(root, ".htaccess");

if (!existsSync(standaloneDir)) {
  throw new Error("Standalone build output not found. Run `npm run build` first.");
}

if (!existsSync(staticDir)) {
  throw new Error("Static build output not found. Run `npm run build` first.");
}

rmSync(deployDir, { force: true, recursive: true });
mkdirSync(deployStaticDir, { recursive: true });

cpSync(standaloneDir, deployDir, { recursive: true });
cpSync(staticDir, deployStaticDir, { recursive: true });
renameSync(join(deployDir, "server.js"), deployStandaloneServer);
copyFileSync(deployWrapperServer, join(deployDir, "server.js"));
copyFileSync(deployHtaccess, join(deployDir, ".htaccess"));

console.log("DreamHost package prepared at deploy/dreamhost");
console.log("Upload the contents of deploy/dreamhost to your server.");
