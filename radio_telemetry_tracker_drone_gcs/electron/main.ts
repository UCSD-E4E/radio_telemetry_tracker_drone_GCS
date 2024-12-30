import { app, BrowserWindow } from "electron";
import * as path from "path";
import { spawn, ChildProcess, StdioOptions, exec } from "child_process";
import * as os from "os";
import treeKill from 'tree-kill';

let pythonProcess: ChildProcess | null = null;
let mainWindow: BrowserWindow | null = null;

function cleanupProcesses(): void {
  if (pythonProcess && pythonProcess.pid !== undefined) {
    try {
      // First try tree-kill
      treeKill(pythonProcess.pid, 'SIGKILL', (err) => {
        if (err) {
          console.error('Error killing process tree:', err);
        }
        
        // On Windows, also try to kill by process name to ensure cleanup
        if (process.platform === 'win32') {
          exec('taskkill /F /IM radio_telemetry_tracker_drone_gcs_server.exe', (error, stdout, stderr) => {
            if (error) {
              console.error('Error killing process by name:', error);
            }
            if (stderr) {
              console.error('Taskkill stderr:', stderr);
            }
            if (stdout) {
              console.log('Taskkill stdout:', stdout);
            }
          });
        }
      });
    } catch (err) {
      console.error("Error in cleanup process:", err);
    } finally {
      pythonProcess = null;
    }
  } else if (process.platform === 'win32') {
    // Even if we don't have a process reference, try to kill by name
    exec('taskkill /F /IM radio_telemetry_tracker_drone_gcs_server.exe', (error, stdout, stderr) => {
      if (error) {
        console.error('Error killing process by name:', error);
      }
      if (stderr) {
        console.error('Taskkill stderr:', stderr);
      }
      if (stdout) {
        console.log('Taskkill stdout:', stdout);
      }
    });
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  const indexPath = path.join(__dirname, "index.html");
  
  if (require("fs").existsSync(indexPath)) {
    mainWindow.loadFile(indexPath);
  } else {
    console.error("Could not find index.html at", indexPath);
    app.quit();
  }

  mainWindow.on("closed", () => {
    cleanupProcesses();
    mainWindow = null;
  });
}

function startPythonServer(): void {
  const platform = os.platform();
  let exeName = "radio_telemetry_tracker_drone_gcs_server";

  if (platform === "win32") {
    exeName += ".exe";
  }

  const exePath = path.join(process.resourcesPath, exeName);
  console.log("Spawning Python server from:", exePath);

  const options = {
    cwd: process.resourcesPath,
    detached: false,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'] as StdioOptions
  };

  try {
    pythonProcess = spawn(exePath, [], options);

    if (pythonProcess) {
      pythonProcess.stdout?.on("data", (data) => {
        console.log(`[Python STDOUT] ${data}`);
      });

      pythonProcess.stderr?.on("data", (data) => {
        console.error(`[Python STDERR] ${data}`);
      });

      pythonProcess.on("close", (code) => {
        console.log(`[Python] server exited with code ${code}`);
        pythonProcess = null;
      });

      pythonProcess.on("error", (err) => {
        console.error("[Python] Failed to start server:", err);
        pythonProcess = null;
      });
    }
  } catch (err) {
    console.error("[Python] Failed to spawn server:", err);
  }
}

// App lifecycle events
app.whenReady().then(() => {
  startPythonServer();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Handle window-all-closed event
app.on("window-all-closed", () => {
  cleanupProcesses();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Handle the quit event
app.on("quit", () => {
  cleanupProcesses();
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  cleanupProcesses();
  app.quit();
});

// Handle SIGINT and SIGTERM
process.on("SIGINT", () => {
  cleanupProcesses();
  app.quit();
});

process.on("SIGTERM", () => {
  cleanupProcesses();
  app.quit();
});
