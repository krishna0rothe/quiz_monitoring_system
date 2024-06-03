const { ipcRenderer } = require("electron");

const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");

document.body.appendChild(canvas);

ipcRenderer.on("frameData", (event, data) => {
  const frameData = data.frame;
  const detections = data.detections;
  const alerts = data.alerts;

  // Decode base64 frame data
  const byteCharacters = atob(frameData);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: "image/jpeg" });
  const url = URL.createObjectURL(blob);

  const img = new Image();
  img.src = url;

  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;

    detections.forEach((detection) => {
      ctx.beginPath();
      ctx.rect(detection.x, detection.y, detection.width, detection.height);
      ctx.stroke();
      ctx.fillStyle = "red";
      ctx.font = "16px Arial";
      ctx.fillText(
        detection.label,
        detection.x,
        detection.y > 10 ? detection.y - 5 : 10
      );
    });

    // Revoke the object URL to free memory
    URL.revokeObjectURL(url);
  };

  // Display alerts
  if (alerts.multiple_persons) {
    alert("Multiple persons detected!");
  }
  if (alerts.phone_detected) {
    alert("Smartphone detected!");
  }
});
