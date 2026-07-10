import assert from "node:assert/strict";
import { chmodSync, cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, readlinkSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", ...options });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}

test("dry-run shows the complete bounded install without writing", () => {
  const root = mkdtempSync(join(tmpdir(), "lmab-installer-dry-"));
  try {
    const result = run("bash", ["install.sh", "--yes", "--dry-run", "--no-launch", "--install-dir", join(root, "home")], { cwd: process.cwd() });
    assert.match(result.stdout, /clone public source/);
    assert.match(result.stdout, /git clone/);
    assert.match(result.stdout, /claude plugin/i);
    assert.equal(existsSync(join(root, "home")), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("installs from a public-style git source and is idempotent", () => {
  const root = mkdtempSync(join(tmpdir(), "lmab-installer-"));
  const source = join(root, "source-repo");
  const home = join(root, "home");
  const fakeBin = join(root, "bin");
  const installRoot = join(home, ".lmab");
  try {
    cpSync(process.cwd(), source, {
      recursive: true,
      filter: (path) => !path.includes(`${join(process.cwd(), ".git")}`) && !path.includes(`${join(process.cwd(), ".lmab")}`),
    });
    rmSync(join(source, ".git"), { recursive: true, force: true });
    run("git", ["init", "-b", "main"], { cwd: source });
    run("git", ["add", "."], { cwd: source });
    run("git", ["-c", "user.name=LMAB Test", "-c", "user.email=test@example.com", "commit", "-m", "fixture"], { cwd: source });

    mkdirSync(fakeBin, { recursive: true });
    const fakeClaude = join(fakeBin, "claude");
    writeFileSync(fakeClaude, `#!/bin/sh\nprintf '%s\\n' "$*" >> "$CLAUDE_LOG"\nif [ "$1 $2" = "plugin list" ]; then printf '[]\\n'; fi\nexit 0\n`);
    chmodSync(fakeClaude, 0o755);
    const env = {
      ...process.env,
      HOME: home,
      PATH: `${fakeBin}:${process.env.PATH}`,
      CLAUDE_LOG: join(root, "claude.log"),
      LMAB_REPO_URL: `file://${source}`,
    };
    const args = ["install.sh", "--yes", "--no-launch", "--install-dir", installRoot];
    run("bash", args, { cwd: process.cwd(), env });
    run("bash", args, { cwd: process.cwd(), env });

    assert.equal(existsSync(join(installRoot, ".owned-by-lmab")), true);
    assert.equal(existsSync(join(installRoot, "source", ".claude-plugin", "plugin.json")), true);
    assert.equal(readlinkSync(join(home, ".local", "bin", "lmab")), join(installRoot, "source", "bin", "lmab"));
    const calls = readFileSync(join(root, "claude.log"), "utf8");
    assert.match(calls, /plugin marketplace add/);
    assert.match(calls, /plugin install lmab@lmab/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

