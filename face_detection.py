import cv2
import sys
import json
import base64
from multiprocessing import Process, Queue, Event
import numpy as np

def detect_faces_objects(queue, terminate_event):
    cap = cv2.VideoCapture(0)

    # Load YOLOv4-Tiny model
    net = cv2.dnn.readNet("yolov4-tiny.weights", "yolov4-tiny.cfg")
    layer_names = net.getLayerNames()
    output_layers = [layer_names[i - 1] for i in net.getUnconnectedOutLayers()]

    # Load class names
    with open("coco.names", "r") as f:
        classes = [line.strip() for line in f.readlines()]

    while not terminate_event.is_set():
        ret, frame = cap.read()
        if not ret:
            continue

        # Preprocess the frame
        blob = cv2.dnn.blobFromImage(frame, 0.00392, (416, 416), (0, 0, 0), True, crop=False)
        net.setInput(blob)
        outs = net.forward(output_layers)

        class_ids = []
        confidences = []
        boxes = []
        for out in outs:
            for detection in out:
                scores = detection[5:]
                class_id = np.argmax(scores)
                confidence = scores[class_id]
                if confidence > 0.5:
                    # Object detected
                    center_x = int(detection[0] * frame.shape[1])
                    center_y = int(detection[1] * frame.shape[0])
                    w = int(detection[2] * frame.shape[1])
                    h = int(detection[3] * frame.shape[0])
                    x = int(center_x - w / 2)
                    y = int(center_y - h / 2)
                    boxes.append([x, y, w, h])
                    confidences.append(float(confidence))
                    class_ids.append(class_id)

        indexes = cv2.dnn.NMSBoxes(boxes, confidences, 0.5, 0.4)

        # Collect detection data
        detection_data = []
        num_persons = 0
        phone_detected = False
        for i in range(len(boxes)):
            if i in indexes:
                x, y, w, h = boxes[i]
                label = str(classes[class_ids[i]])
                detection_data.append({"label": label, "x": x, "y": y, "width": w, "height": h})
                if label == "person":
                    num_persons += 1
                if label == "cell phone":
                    phone_detected = True
                print(f"Detected {label} at ({x}, {y}, {w}, {h}) with confidence {confidences[i]}")  # Debug information

        # Encode frame as JPEG for transmission
        ret, buffer = cv2.imencode('.jpg', frame)
        frame_data = base64.b64encode(buffer).decode('utf-8')  # Encode as base64 string

        # Prepare JSON data
        data = {
            "frame": frame_data,
            "detections": detection_data,
            "alerts": {
                "multiple_persons": num_persons > 1,
                "phone_detected": phone_detected
            }
        }

        # Send data through the queue
        queue.put(json.dumps(data))

    cap.release()  # Release the camera capture
    cv2.destroyAllWindows()  # Close all OpenCV windows

def main():
    terminate_event = Event()
    queue = Queue()
    p = Process(target=detect_faces_objects, args=(queue, terminate_event))
    p.start()

    try:
        while True:
            if not queue.empty():
                data = queue.get()
                print(data)
                sys.stdout.flush()  # Ensure data is flushed to stdout
    except KeyboardInterrupt:
        terminate_event.set()
        p.join()  # Wait for the process to terminate

if __name__ == "__main__":
    main()
