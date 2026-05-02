// Tests for preview_server.mjs port detection and lifecycle management.
// Run: node --test C:/dev/morph-deck-skill/plugin/generators/__tests__/preview_server.test.mjs

import { test } from "node:test";
import { strict as assert } from "node:assert";
import { createServer } from "node:net";
import { spawn } from "node:child_process";
import {
  isPortFree,
  findFreePort,
  startPreview,
  waitForPortReady,
} from "../lib/preview_server.mjs";

test("isPortFree returns true for high random port", async () => {
  const port = Math.floor(Math.random() * 10000) + 50000;
  const free = await isPortFree(port);
  assert.equal(free, true);
});

test("isPortFree returns false for port we open", async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "localhost", resolve));
  const port = server.address().port;

  const free = await isPortFree(port);
  assert.equal(free, false);

  server.close();
});

test("findFreePort returns port in range when start is taken", async () => {
  // Open server on 4173
  const server = createServer();
  await new Promise((resolve) => server.listen(4173, "localhost", resolve));

  try {
    const port = await findFreePort(4173, 4180);
    assert.ok(port >= 4174 && port <= 4180);
    assert.notEqual(port, 4173);
  } finally {
    server.close();
  }
});

test("findFreePort throws when all ports busy", async () => {
  const servers = [];
  try {
    // Open servers on 4173-4180
    for (let p = 4173; p <= 4180; p++) {
      const srv = createServer();
      await new Promise((resolve) => srv.listen(p, "localhost", resolve));
      servers.push(srv);
    }

    // All ports busy, should throw
    let threw = false;
    try {
      await findFreePort(4173, 4180);
    } catch (e) {
      threw = true;
      assert.match(e.message, /No free ports/);
    }
    assert.ok(threw);
  } finally {
    for (const s of servers) {
      s.close();
    }
  }
});

test("startPreview smoke test: spawn child, kill cleanly", async () => {
  // Create a minimal test directory with a fake package.json
  // We'll spawn a simple node process that listens on a port
  const { tmpdir } = await import("node:os");
  const { mkdtempSync, writeFileSync } = await import("node:fs");
  const { join } = await import("node:path");

  const tmpDir = mkdtempSync(join(tmpdir(), "preview-test-"));

  // Write a minimal package.json + a simple server script
  writeFileSync(
    join(tmpDir, "package.json"),
    JSON.stringify({
      name: "test",
      scripts: {
        preview: 'node server.mjs',
        dev: 'node server.mjs',
      },
    })
  );

  // Simple HTTP server that listens on the assigned port
  writeFileSync(
    join(tmpDir, "server.mjs"),
    `
import { createServer } from 'node:http';
const PORT = process.env.PORT || 4173;
const server = createServer((req, res) => {
  res.writeHead(200);
  res.end('OK');
});
server.listen(PORT, () => {
  console.log('Server listening on port ' + PORT);
  setTimeout(() => process.exit(0), 5000);
});
`
  );

  try {
    const port = await findFreePort(4173, 4180);
    const handle = await startPreview({
      deckPath: tmpDir,
      mode: "preview",
      port,
    });

    assert.ok(handle.url);
    assert.ok(handle.child);
    assert.ok(handle.kill);
    assert.match(handle.url, /http:\/\/localhost:\d+/);

    // Kill it
    await handle.kill(500);

    // Verify child is exited
    assert.ok(handle.child.exitCode !== null || handle.child.killed);

    // Give OS a moment to fully release file handles
    await new Promise((r) => setTimeout(r, 300));
  } finally {
    // Cleanup (rmSync needs recursive: true for non-empty dirs)
    const { rmSync } = await import("node:fs");
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors in tests
      console.warn("Cleanup warning:", e.message);
    }
  }
});
