// Process lifecycle management for morph-deck video builder.
// Exports killTree, registerCleanup, findFreePortWithFallback.

import { spawn } from "node:child_process";
import { platform } from "node:os";
import { findFreePort } from "./preview_server.mjs";

/**
 * Kill a process tree gracefully with SIGTERM, then force with SIGKILL.
 * Cross-platform: Windows uses taskkill /T (tree-kill), Unix uses process group signals.
 *
 * @param {number} pid - Process ID to kill
 * @param {number} gracePeriodMs - Grace period before SIGKILL (default 2000ms)
 * @returns {Promise<void>} Resolves when process has actually exited
 */
export async function killTree(pid, gracePeriodMs = 2000) {
  if (!pid) return;

  const isWin = platform() === "win32";

  if (isWin) {
    // Windows: taskkill /pid <pid> /T /F forces tree-kill
    return new Promise((resolve) => {
      const proc = spawn("taskkill", ["/pid", String(pid), "/T", "/F"], {
        windowsHide: true,
      });

      proc.on("close", () => {
        resolve();
      });

      proc.on("error", () => {
        // taskkill failed; process may already be dead
        resolve();
      });

      // Safety timeout in case taskkill hangs
      setTimeout(() => resolve(), gracePeriodMs + 500);
    });
  } else {
    // Unix: SIGTERM to process group, then SIGKILL
    return new Promise((resolve) => {
      try {
        // Send SIGTERM to the process group (-pid sends to group)
        process.kill(-pid, "SIGTERM");
      } catch (e) {
        // Process may already be dead (ESRCH)
        if (e.code === "ESRCH") {
          resolve();
          return;
        }
      }

      let killed = false;

      const gracetimeout = setTimeout(() => {
        if (!killed) {
          killed = true;
          try {
            process.kill(-pid, "SIGKILL");
          } catch (e) {
            // Already dead
          }
        }
      }, gracePeriodMs);

      // Poll for process exit via kill(pid, 0) check
      const pollInterval = setInterval(() => {
        try {
          // kill(pid, 0) returns 0 if process exists, throws if not
          process.kill(pid, 0);
        } catch (e) {
          if (e.code === "ESRCH") {
            // Process has exited
            clearTimeout(gracetimeout);
            clearInterval(pollInterval);
            killed = true;
            resolve();
          }
        }
      }, 50);

      // Fallback timeout
      setTimeout(() => {
        clearTimeout(gracetimeout);
        clearInterval(pollInterval);
        resolve();
      }, gracePeriodMs + 1000);
    });
  }
}

/**
 * Register cleanup handlers to kill a child process on exit/signal.
 * Returns an unregister function for tests.
 *
 * @param {ChildProcess} child - The child process to manage
 * @returns {() => void} Unregister function to remove handlers
 */
export function registerCleanup(child) {
  const exitHandler = async () => {
    if (child.pid) {
      await killTree(child.pid, 1000);
    }
  };

  const sigintHandler = async () => {
    if (child.pid) {
      await killTree(child.pid, 1000);
    }
  };

  const sigtermHandler = async () => {
    if (child.pid) {
      await killTree(child.pid, 1000);
    }
  };

  process.on("exit", exitHandler);
  process.on("SIGINT", sigintHandler);
  process.on("SIGTERM", sigtermHandler);

  // Return unregister function
  return () => {
    process.removeListener("exit", exitHandler);
    process.removeListener("SIGINT", sigintHandler);
    process.removeListener("SIGTERM", sigtermHandler);
  };
}

/**
 * Find a free port in range [4173, 4180], or throw with clear error.
 *
 * @param {number} start - Start port (default 4173)
 * @param {number} end - End port (default 4180)
 * @returns {Promise<number>} Free port number
 * @throws {Error} If all ports in range are busy
 */
export async function findFreePortWithFallback(start = 4173, end = 4180) {
  try {
    return await findFreePort(start, end);
  } catch (e) {
    // All ports busy: provide clear error message
    throw new Error(
      `All ports in range ${start}-${end} in use; close other dev servers and retry`
    );
  }
}
