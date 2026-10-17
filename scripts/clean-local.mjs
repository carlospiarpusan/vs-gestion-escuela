import { existsSync, lstatSync, readdirSync, realpathSync, rmSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
if (args.some((arg) => arg !== "--apply")) {
  console.error("Usage: npm run clean:local -- [--apply]");
  process.exit(1);
}

const targets = [
  ".next/cache",
  ".next/dev",
  ".vercel/output",
  ".playwright-cli",
  "node_modules/.vite",
  "mobile/node_modules/.cache",
  "mobile/android/app/build",
  "mobile/android/app/.cxx",
  "mobile/android/build",
  "mobile/android/.gradle",
  "mobile/android/.kotlin",
];

function insideRoot(path) {
  const rel = relative(realpathSync(root), realpathSync(path));
  return rel !== "" && rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

// Native dependencies retain their source; only Gradle/CMake output is disposable.
const modules = join(root, "mobile/node_modules");
if (existsSync(modules) && !lstatSync(modules).isSymbolicLink() && insideRoot(modules)) {
  const packages = [];
  for (const entry of readdirSync(modules, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    if (entry.name.startsWith("@")) {
      for (const scoped of readdirSync(join(modules, entry.name), { withFileTypes: true })) {
        if (scoped.isDirectory()) packages.push(join(modules, entry.name, scoped.name));
      }
    } else {
      packages.push(join(modules, entry.name));
    }
  }
  for (const pkg of packages) {
    for (const cache of ["build", ".cxx", ".gradle", ".kotlin"]) {
      targets.push(relative(root, join(pkg, "android", cache)));
    }
  }
}

console.log(
  args.includes("--apply")
    ? "Removing generated local files:"
    : "Preview only. Add --apply to remove:"
);
for (const target of targets) {
  const path = join(root, target);
  if (!existsSync(path)) continue;
  if (lstatSync(path).isSymbolicLink() || !insideRoot(path)) {
    throw new Error(`Refusing to clean a symlink or external path: ${target}`);
  }
  console.log(target);
  if (args.includes("--apply")) rmSync(path, { recursive: true, force: true });
}
console.log(
  "Source, installed dependencies, credentials, signing keys and Git history are preserved."
);
