import { app, BrowserWindow } from "electron";
import * as path from "path";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import * as os from "os";

let pythonProcess: ChildProcessWithoutNullStreams | null = null;

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Try both development and production paths
  const devPath = path.join(__dirname, "..", "electron", "index.html");
  const prodPath = path.join(__dirname, "index.html");
  
  if (isDev() && require("fs").existsSync(devPath)) {
    mainWindow.loadFile(devPath);
  } else if (require("fs").existsSync(prodPath)) {
    mainWindow.loadFile(prodPath);
  } else {
    console.error("Could not find index.html in either", devPath, "or", prodPath);
    app.quit();
  }
}

function startPythonServer(): void {
  // If in dev mode, rely on 'npm run dev:backend'
  if (isDev()) {
    console.log(
      "[Dev] Skipping spawn of PyInstaller binary, since 'npm run dev:backend' is already running",
    );
    return;
  }

  // Production mode: spawn the compiled binary from resources
  const platform = os.platform(); // 'win32', 'linux', 'darwin', etc.
  let exeName = "radio_telemetry_tracker_drone_gcs_server";

  if (platform === "win32") {
    exeName += ".exe"; // On Windows, add .exe
  }

  // The file should be in your app's resources folder
  const exePath = path.join(process.resourcesPath, exeName);
  console.log("[Prod] Spawning Python server from:", exePath);

  pythonProcess = spawn(exePath, [], { cwd: process.resourcesPath });

  pythonProcess.stdout.on("data", (data) => {
    console.log(`[Python STDOUT] ${data}`);
  });

  pythonProcess.stderr.on("data", (data) => {
    console.error(`[Python STDERR] ${data}`);
  });

  pythonProcess.on("close", (code) => {
    console.log(`[Python] server exited with code ${code}`);
    pythonProcess = null;
  });
}

function isDev(): boolean {
  // If NODE_ENV=development or Electron not packaged, we assume dev mode
  return process.env.NODE_ENV === "development" || !app.isPackaged;
}

app.whenReady().then(() => {
  startPythonServer();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// When all windows are closed, shut down the Python process
app.on("window-all-closed", () => {
  if (pythonProcess) {
    pythonProcess.kill();
    pythonProcess = null;
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});
