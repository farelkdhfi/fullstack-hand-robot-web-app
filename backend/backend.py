import cv2
import mediapipe as mp
import base64
import numpy as np
import json
import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import uvicorn
from collections import deque

app = FastAPI()

# --- KONFIGURASI MEDIAPIPE (AI) ---
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(max_num_hands=1, min_detection_confidence=0.7)

# --- KONFIGURASI MANUAL CV (DEFAULT) ---
# Nilai awal (bisa berubah kalau dikalibrasi)
lower_skin = np.array([0, 20, 70], dtype=np.uint8)
upper_skin = np.array([20, 255, 255], dtype=np.uint8)

# Variabel Smoothing (Agar pergerakan tidak gemetar)
prev_x, prev_y = 0, 0
SMOOTHING_FACTOR = 0.5 # 0.1 (Lambat halus) s/d 0.9 (Cepat kasar)

def calculate_distance(p1, p2):
    return np.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2 + (p1.z - p2.z)**2)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    # Kita perlu declare 'global' untuk mengubah variable di luar loop
    global lower_skin, upper_skin, prev_x, prev_y 

    current_mode = "AI" 
    is_calibrating = False # Status mode kalibrasi
    calibration_step = 0 # 0: Idle, 1: Prepare (Tunggu tangan), 2: Sampling
    calibration_timer = 0
    calibration_frames = 0
    
    # State Logging
    prev_gesture = "NONE"

    await websocket.send_text(json.dumps({
        "landmarks": [], 
        "logs": [{"time": "SYSTEM", "type": "SYSTEM", "message": "Backend Loaded. Ready."}]
    }))

    while True:
        frame_logs = []
        def log(type, msg):
            timestamp = datetime.datetime.now().strftime("%H:%M:%S")
            frame_logs.append({"time": timestamp, "type": type, "message": msg})

        try:
            data = await websocket.receive_text()

            # --- 1. COMMAND HANDLER ---
            if data.startswith("MODE:"):
                cmd_parts = data.split(":")
                new_mode = cmd_parts[1]
                
                if new_mode == "CALIBRATE":
                    is_calibrating = True
                    calibration_step = 1 # Masuk tahap persiapan
                    calibration_timer = 0
                    log("WARNING", "PREPARE: Place hand in box...")
                elif new_mode in ["AI", "MANUAL"]:
                    current_mode = new_mode
                    is_calibrating = False
                    calibration_step = 0
                    log("SYSTEM", f"SWITCHED TO {current_mode} MODE")
                
                # Kirim feedback instan
                await websocket.send_text(json.dumps({"landmarks": [], "logs": frame_logs}))
                continue

            # --- 2. DECODE IMAGE ---
            try:
                if "," in data: header, encoded = data.split(",", 1)
                else: encoded = data
                img_bytes = base64.b64decode(encoded)
                nparr = np.frombuffer(img_bytes, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                if img is None: continue
            except: continue

            response = {
                "landmarks": [], "gesture": "NONE", "confidence": 0,
                "handedness": "N/A", "fingerTip": {"x": 0, "y": 0, "z": 0},
                "logs": frame_logs, "mode": "CALIBRATING" if is_calibrating else current_mode
            }

            # =========================================================
            # FITUR SPESIAL: KALIBRASI WARNA KULIT (OTOMATIS)
            # =========================================================
            if is_calibrating:
                h, w, _ = img.shape
                roi_x, roi_y, roi_w, roi_h = int(w/2)-50, int(h/2)-50, 100, 100
                
                # TAHAP 1: PREPARE
                if calibration_step == 1:
                    calibration_timer += 1
                    status_msg = f"PLACE HAND IN BOX ({60 - calibration_timer})"
                    
                    response["gesture"] = status_msg
                    response["mode"] = "CALIBRATING_WAIT"
                    
                    if calibration_timer > 60:
                        calibration_step = 2 
                        calibration_timer = 0
                        log("INFO", "SAMPLING COLOR NOW...")
                
                # TAHAP 2: SAMPLING (Ambil rata-rata warna selama 60 frame)
                elif calibration_step == 2:
                    roi = img[roi_y:roi_y+roi_h, roi_x:roi_x+roi_w]
                    roi_hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
                    avg_hsv = np.mean(roi_hsv, axis=(0,1))
                    
                    h_val = avg_hsv[0] # Hue 
                    s_val = avg_hsv[1] # Saturation
                    v_val = avg_hsv[2] # Value
                    
                    # LOGIKA TOLERANSI (Loose Threshold)
                    lower_skin = np.array([
                        max(0, h_val - 30), 
                        max(5, s_val - 30), 
                        max(40, v_val - 60)
                    ], dtype=np.uint8)
                    
                    upper_skin = np.array([
                        min(180, h_val + 30), 
                        255, 
                        255
                    ], dtype=np.uint8)
                    
                    calibration_timer += 1
                    response["gesture"] = "SAMPLING..."
                    response["mode"] = "CALIBRATING_SCAN"
                    
                    if calibration_timer > 60:
                        is_calibrating = False
                        calibration_step = 0
                        current_mode = "MANUAL"
                        log("SUCCESS", f"Calibrated! H:{int(h_val)} S:{int(s_val)} V:{int(v_val)}")
                        
                await websocket.send_text(json.dumps(response))
                continue

            # =========================================================
            # MODE 1: AI (MediaPipe)
            # =========================================================
            if current_mode == "AI":
                img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                results = hands.process(img_rgb)
                
                if results.multi_hand_landmarks:
                    lms = results.multi_hand_landmarks[0]
                    # Convert to list
                    response["landmarks"] = [{"x": l.x, "y": l.y, "z": l.z} for l in lms.landmark]
                    
                    # Gesture Logic
                    dist = calculate_distance(lms.landmark[4], lms.landmark[8])
                    response["gesture"] = "GRIPPING" if dist < 0.08 else "OPEN HAND"
                    response["handedness"] = "LEFT" if results.multi_handedness[0].classification[0].label == "Right" else "RIGHT"
                    response["confidence"] = 95
                    response["fingerTip"] = {"x": lms.landmark[8].x, "y": lms.landmark[8].y, "z": lms.landmark[8].z}
                    
                    # Sync smoothing variable biar pas switch mode tidak loncat
                    prev_x, prev_y = response["fingerTip"]["x"], response["fingerTip"]["y"]

                    # --- LOGGING MODE AI ---
                    if response["gesture"] != prev_gesture:
                        log_type = "SUCCESS" if response["gesture"] == "GRIPPING" else "NEUTRAL"
                        log(log_type, f"AI Detect: {response['gesture']}")
                        prev_gesture = response["gesture"]

            # =========================================================
            # MODE 2: MANUAL
            # =========================================================
            elif current_mode == "MANUAL":
                blurred = cv2.GaussianBlur(img, (7, 7), 0)
                hsv = cv2.cvtColor(blurred, cv2.COLOR_BGR2HSV)
                mask = cv2.inRange(hsv, lower_skin, upper_skin)
                
                # Pembersihan Noise
                kernel = np.ones((5, 5), np.uint8)
                mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
                mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

                contours, _ = cv2.findContours(mask, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

                if len(contours) > 0:
                    cnt = max(contours, key=cv2.contourArea)
                    area = cv2.contourArea(cnt)

                    if area > 2000: # Filter noise
                        hull = cv2.convexHull(cnt)
                        
                        # Centroid
                        M = cv2.moments(cnt)
                        if M["m00"] != 0:
                            cx = int(M["m10"] / M["m00"])
                            cy = int(M["m01"] / M["m00"])
                        else:
                            cx, cy = 0, 0
                        
                        # Fingertip Tracking
                        topmost = tuple(cnt[cnt[:,:,1].argmin()][0])
                        
                        # Smoothing
                        h_img, w_img, _ = img.shape
                        raw_x = topmost[0] / w_img
                        raw_y = topmost[1] / h_img
                        
                        smooth_x = (prev_x * SMOOTHING_FACTOR) + (raw_x * (1 - SMOOTHING_FACTOR))
                        smooth_y = (prev_y * SMOOTHING_FACTOR) + (raw_y * (1 - SMOOTHING_FACTOR))
                        
                        prev_x, prev_y = smooth_x, smooth_y 
                        
                        # Gesture Logic (Defects)
                        hull_indices = cv2.convexHull(cnt, returnPoints=False)
                        count_defects = 0
                        try:
                            defects = cv2.convexityDefects(cnt, hull_indices)
                            if defects is not None:
                                for i in range(defects.shape[0]):
                                    s, e, f, d = defects[i, 0]
                                    start = tuple(cnt[s][0])
                                    end = tuple(cnt[e][0])
                                    far = tuple(cnt[f][0])
                                    
                                    a = np.sqrt((end[0]-start[0])**2 + (end[1]-start[1])**2)
                                    b = np.sqrt((far[0]-start[0])**2 + (far[1]-start[1])**2)
                                    c = np.sqrt((end[0]-far[0])**2 + (end[1]-far[1])**2)
                                    angle = np.arccos((b**2 + c**2 - a**2) / (2*b*c)) * 57
                                    if angle <= 90: count_defects += 1
                        except: pass

                        is_grip = count_defects <= 1
                        
                        # Fake Skeleton
                        norm_cx = cx / w_img
                        norm_cy = cy / h_img
                        
                        fake_lms = []
                        for i in range(21):
                            if i == 0: 
                                fake_lms.append({"x": norm_cx, "y": norm_cy, "z": 0})
                            elif i == 8: 
                                fake_lms.append({"x": smooth_x, "y": smooth_y, "z": 0})
                            elif i in [5, 6, 7]: 
                                ratio = (i-4)/4 
                                lx = norm_cx + (smooth_x - norm_cx) * ratio
                                ly = norm_cy + (smooth_y - norm_cy) * ratio
                                fake_lms.append({"x": lx, "y": ly, "z": 0})
                            else:
                                fake_lms.append({"x": norm_cx, "y": norm_cy, "z": 0})

                        response["landmarks"] = fake_lms
                        response["gesture"] = "GRIPPING" if is_grip else "OPEN HAND"
                        response["confidence"] = 80
                        response["handedness"] = "Manual Pro"
                        response["fingerTip"] = {"x": smooth_x, "y": smooth_y, "z": 0}
                        
                        if response["gesture"] != prev_gesture:
                            log("INFO", f"Gesture: {response['gesture']} (Defects: {count_defects})")
                            prev_gesture = response["gesture"]

            await websocket.send_text(json.dumps(response))

        except WebSocketDisconnect:
            break
        except Exception as e:
            print(f"Error: {e}")
            break

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)