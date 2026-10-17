import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const script = join(dirname(fileURLToPath(import.meta.url)), "clean-local.mjs");

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "condusoft-clean-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, "scripts"));
  copyFileSync(script, join(root, "scripts/clean-local.mjs"));
  function file(name) {
    mkdirSync(dirname(join(root, name)), { recursive: true });
    writeFileSync(join(root, name), "preserve unless generated");
  }
  return {
    root,
    file,
    run: (...args) =>
      execFileSync(process.execPath, [join(root, "scripts/clean-local.mjs"), ...args], {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      }),
  };
}

test("the default command only previews generated files", (t) => {
  const f = fixture(t);
  f.file(".next/cache/temporary");
  assert.match(f.run(), /Preview only/);
  assert.ok(existsSync(join(f.root, ".next/cache/temporary")));
});

test("apply removes build output but preserves dependencies, source, keys and history", (t) => {
  const f = fixture(t);
  const generated = [
    ".next/cache/temporary",
    "mobile/android/app/build/temporary",
    "mobile/node_modules/expo/android/build/temporary",
    "mobile/node_modules/@scope/lib/android/.cxx/temporary",
  ];
  const preserved = [
    "src/app/page.tsx",
    ".env.local",
    ".git/HEAD",
    ".next/server/app.js",
    "mobile/upload-keystore.jks",
    "mobile/android/app/src/Main.kt",
    "mobile/node_modules/expo/package.json",
    "mobile/node_modules/expo/android/src/Main.kt",
    "mobile/node_modules/expo-sqlite/android/libsql/library",
  ];
  for (const name of [...generated, ...preserved]) f.file(name);
  f.run("--apply");
  for (const name of generated) assert.equal(existsSync(join(f.root, name)), false, name);
  for (const name of preserved) assert.ok(existsSync(join(f.root, name)), name);
});

test("cleanup refuses a cache reached through an external symlink", (t) => {
  const f = fixture(t);
  const external = mkdtempSync(join(tmpdir(), "condusoft-external-test-"));
  t.after(() => rmSync(external, { recursive: true, force: true }));
  mkdirSync(join(external, "cache"));
  writeFileSync(join(external, "cache/keep"), "keep");
  symlinkSync(external, join(f.root, ".next"), "dir");
  assert.throws(() => f.run("--apply"), /Refusing to clean/);
  assert.ok(existsSync(join(external, "cache/keep")));
});

test("unknown arguments cannot enable deletion", (t) => {
  const f = fixture(t);
  f.file(".next/cache/temporary");
  const result = spawnSync(process.execPath, [join(f.root, "scripts/clean-local.mjs"), "--all"], {
    encoding: "utf8",
  });
  assert.equal(result.status, 1);
  assert.ok(existsSync(join(f.root, ".next/cache/temporary")));
});
