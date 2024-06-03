const { app, BrowserWindow } = require("electron");
const { spawn } = require("child_process");
const path = require("path");

let mainWindow;
let pythonProcess;

app.on("ready", () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  });

  mainWindow.loadFile("index.html");
  mainWindow.webContents.openDevTools();

  const pythonScriptPath = path.join(__dirname, "face_detection.py");
  const pythonExecutable = path.join(
    __dirname,
    "myenv",
    "Scripts",
    "python.exe"
  );
  pythonProcess = spawn(pythonExecutable, [pythonScriptPath]);

  pythonProcess.stdout.on("data", (data) => {
    const lines = data.toString().split("\n");
    lines.forEach((line) => {
      if (line.trim()) {
        try {
          const parsedData = JSON.parse(line);
          mainWindow.webContents.send("frameData", parsedData);
        } catch (error) {
          console.error("Error parsing JSON:", error);
        }
      }
    });
  });

  pythonProcess.stderr.on("data", (data) => {
    console.error(`Python stderr: ${data}`);
  });

  mainWindow.on("closed", () => {
    if (pythonProcess) {
      pythonProcess.kill();
    }
    app.quit();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (pythonProcess) {
    pythonProcess.kill();
  }
});
