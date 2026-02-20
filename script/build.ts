import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

console.log("Building Pawtrait Pros...");

// Step 1: Build the client with Vite (outputs directly to dist/public via vite.config.ts)
console.log("\n[1/2] Building client...");
execSync("npx vite build", { cwd: rootDir, stdio: "inherit" });

// Step 2: Bundle the server with esbuild
console.log("\n[2/2] Bundling server...");
execSync(
  `npx esbuild server/index.ts --bundle --platform=node --format=cjs --outfile=dist/index.cjs --packages=external --loader:.ts=ts --target=node20`,
  { cwd: rootDir, stdio: "inherit" }
);

console.log("\nBuild complete! Run 'npm run start' to launch.");
