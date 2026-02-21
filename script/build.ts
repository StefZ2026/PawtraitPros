import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

// Resolve local bin — works both on Render (npx available) and local dev (portable node)
const nodeExe = process.execPath;
const isWindows = process.platform === "win32";
const viteJs = path.join(rootDir, "node_modules", "vite", "bin", "vite.js");
const esbuildJs = path.join(rootDir, "node_modules", "esbuild", "bin", "esbuild");
const viteCmd = isWindows ? `"${nodeExe}" "${viteJs}"` : "npx vite";
const esbuildCmd = isWindows ? `"${nodeExe}" "${esbuildJs}"` : "npx esbuild";

console.log("Building Pawtrait Pros...");

// Step 1: Build the client with Vite (outputs directly to dist/public via vite.config.ts)
console.log("\n[1/2] Building client...");
execSync(`${viteCmd} build`, { cwd: rootDir, stdio: "inherit" });

// Step 2: Bundle the server with esbuild
console.log("\n[2/2] Bundling server...");
execSync(
  `${esbuildCmd} server/index.ts --bundle --platform=node --format=cjs --outfile=dist/index.cjs --packages=external --loader:.ts=ts --target=node20`,
  { cwd: rootDir, stdio: "inherit" }
);

console.log("\nBuild complete! Run 'npm run start' to launch.");
