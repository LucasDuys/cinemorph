import { test } from "node:test";
import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import {
  killTree,
  registerCleanup,
  findFreePortWithFallback,
} from "../lib/process_hygiene.mjs";

// Test 1: killTree finishes a long-running process within graceMs + 500
test("killTree kills a long-running process within grace period", async () => {
  const child = spawn("node", ["-e", "setTimeout(()=>{},10000)"]);
  const pid = child.pid;
  assert(pid, "child has pid");

  const start = Date.now();
  await killTree(pid, 500);
  const elapsed = Date.now() - start;

  // Should finish within grace period + safety margin
  assert(elapsed < 1500, `killTree took ${elapsed}ms, expected < 1500ms`);
});

// Test 2: registerCleanup returns an unregister function that removes listeners
test("registerCleanup returns unregister function", () => {
  const child = spawn("node", ["-e", "setInterval(()=>{},1000)"]);

  const exitListenersBefore = process.listeners("exit").length;

  const unregister = registerCleanup(child);
  const exitListenersAfter = process.listeners("exit").length;

  // Should have added listener
  assert(
    exitListenersAfter > exitListenersBefore,
    "registerCleanup adds exit listener"
  );

  unregister();
  const exitListenersAfterUnregister = process.listeners("exit").length;

  // Should have removed listener
  assert(
    exitListenersAfterUnregister === exitListenersBefore,
    "unregister removes exit listener"
  );

  child.kill("SIGKILL");
});

// Test 3: findFreePortWithFallback returns a port when start is taken
test("findFreePortWithFallback returns available port when start is taken", async () => {
  // Occupy port 4173
  const server = createServer();
  server.listen(4173);

  try {
    const port = await findFreePortWithFallback(4173, 4180);
    assert(
      port >= 4173 && port <= 4180,
      `port ${port} should be in range [4173, 4180]`
    );
    assert(port !== 4173, "port should not be 4173 (occupied)");
  } finally {
    server.close();
  }
});

// Test 4: findFreePortWithFallback throws clear error when all ports busy
test("findFreePortWithFallback throws clear error when all ports busy", async () => {
  // Occupy all ports in range [4173, 4180]
  const servers = [];
  for (let i = 4173; i <= 4180; i++) {
    const srv = createServer();
    srv.listen(i);
    servers.push(srv);
  }

  try {
    let threw = false;
    try {
      await findFreePortWithFallback(4173, 4180);
    } catch (e) {
      threw = true;
      assert(
        e.message.includes("All ports in range 4173-4180 in use"),
        `Error message should mention port range, got: ${e.message}`
      );
    }
    assert(threw, "should throw when all ports busy");
  } finally {
    servers.forEach((srv) => srv.close());
  }
});

// Test 5: killTree smoke test with real process exit event
test("killTree integration: child exits cleanly", async () => {
  const child = spawn("node", ["-e", "setTimeout(()=>{},5000)"]);
  const pid = child.pid;

  let exited = false;
  child.on("exit", () => {
    exited = true;
  });

  await killTree(pid, 500);

  // Give event loop time to process exit event
  await new Promise((r) => setTimeout(r, 100));

  assert(exited || !pid, "child should have exited");
});
