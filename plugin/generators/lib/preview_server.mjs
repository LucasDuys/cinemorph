// Port detection and preview/dev server lifecycle for morph-deck video builder.
// Exports isPortFree, findFreePort, startPreview, waitForPortReady.

import { createConnection } from "node:net";
import { spawn } from "node:child_process";
import { platform } from "node:os";

/**
 * Check if a port is free by attempting a connection.
 * Returns true if free, false if in use.
 */
export async function isPortFree(port) {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host: "localhost" });
    let isOpen = false;

    socket.on("connect", () => {
      isOpen = true;
      socket.destroy();
    });

    socket.on("error", () => {
      // Port is free if connection fails
      resolve(!isOpen);
    });

    socket.on("close", () => {
      resolve(!isOpen);
    });

    // Timeout after 500ms to avoid hanging
    setTimeout(() => {
      if (!isOpen) {
        socket.destroy();
        resolve(true);
      }
    }, 500);
  });
}

/**
 * Find the first free port in [start, end] range.
 * Throws if all ports busy.
 */
export async function findFreePort(start = 4173, end = 4180) {
  for (let port = start; port <= end; port++) {
    const free = await isPortFree(port);
    if (free) return port;
  }
  throw new Error(`No free ports in range [${start}, ${end}]`);
}

/**
 * Poll a port until it becomes reachable (inverse of isPortFree).
 * Internal helper for waiting for server startup.
 */
export async function waitForPortReady(port, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const free = await isPortFree(port);
    if (!free) {
      // Port is in use = server is ready
      return;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(
    `Port ${port} did not become ready within ${timeoutMs}ms`
  );
}

/**
 * Start preview or dev server and return control handle.
 *
 * @param {object} opts - { deckPath, mode = 'preview' | 'dev', port? }
 *   - deckPath: working directory (where package.json / bun.lockb lives)
 *   - mode: 'preview' (runs bun run preview) or 'dev' (runs bun run dev)
 *   - port: target port (auto-selected if omitted)
 *
 * @returns {Promise<{ url, child, kill }>}
 *   - url: http://localhost:PORT
 *   - child: child process handle
 *   - kill: async function to terminate gracefully with SIGTERM -> SIGKILL fallback
 */
export async function startPreview({
  deckPath,
  mode = "preview",
  port,
} = {}) {
  if (!deckPath) throw new Error("deckPath is required");

  // Determine port
  if (!port) {
    port = await findFreePort(4173, 4180);
  } else {
    const free = await isPortFree(port);
    if (!free) {
      throw new Error(`Port ${port} is already in use`);
    }
  }

  // Spawn the server
  const script = mode === "dev" ? "dev" : "preview";
  const child = spawn("bun", ["run", script], {
    cwd: deckPath,
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  // Buffer stdout/stderr for diagnostics
  let stdout = "";
  let stderr = "";
  child.stdout?.on("data", (d) => {
    stdout += d.toString();
    process.stdout.write(`[${script}] ${d}`);
  });
  child.stderr?.on("data", (d) => {
    stderr += d.toString();
    process.stderr.write(`[${script}] ${d}`);
  });

  // Wait for port to become ready
  try {
    await waitForPortReady(port, 20000);
  } catch (e) {
    child.kill("SIGTERM");
    throw e;
  }

  const url = `http://localhost:${port}`;

  // Return control handle
  return {
    url,
    child,
    kill: async (gracePeriodMs = 2000) => {
      return new Promise((resolve) => {
        if (!child.pid) {
          resolve();
          return;
        }

        child.kill("SIGTERM");
        let killed = false;

        const gracetimeout = setTimeout(() => {
          if (!killed) {
            killed = true;
            // Force kill after grace period
            child.kill("SIGKILL");
          }
        }, gracePeriodMs);

        child.on("exit", () => {
          clearTimeout(gracetimeout);
          killed = true;
          resolve();
        });
      });
    },
  };
}
