# Touchless Hand Robot Control 🤖✋

![Project Status](https://img.shields.io/badge/Status-Completed-success)
![Course](https://img.shields.io/badge/Course-Visi%20Komputer%20%26%20Robotika-blue)
![Python](https://img.shields.io/badge/Python-3.10.9-yellow)
![Stack](https://img.shields.io/badge/Frontend-ReactJS%20%7C%20Three.js-cyan)

Project ini adalah implementasi sistem kendali robot tangan 3D berbasis *Computer Vision*. Sistem ini memungkinkan pengguna mengontrol simulasi robot dan memindahkan objek 3D menggunakan gestur tangan secara *touchless* (tanpa sentuhan fisik) melalui webcam laptop.

Dikembangkan sebagai tugas proyek **Ujian Akhir Semester (UAS)** untuk mata kuliah **Visi Komputer dan Robotika**.

## 🌟 Fitur Utama

* **Dual Mode Algorithm:**
    * **AI Mode:** Menggunakan *Deep Learning* (MediaPipe Hands) untuk deteksi kerangka tangan yang presisi dan cepat.
    * **Manual Mode:** Menggunakan metode *Color Thresholding* (HSV) & *Contour Analysis* (OpenCV) untuk deteksi berbasis warna kulit.
* **Low Latency System:** Optimasi pengiriman data frame menggunakan WebSocket dan teknik *Image Resizing* untuk performa *real-time* yang lancar.
* **3D Interactive Simulation:** Visualisasi robot lengan dan objek interaktif menggunakan **React Three Fiber**.
* **Smart Gripping:** Deteksi gestur "mencubit" (pinching) untuk mengambil dan memindahkan objek virtual.
* **Voice Command:** (Khusus Manual Mode) Dukungan perintah suara untuk aksi *gripping*.
* **Diagnostic Dashboard:** Memantau status koneksi, confidence level, dan log sistem secara langsung.

## 🛠️ Teknologi yang Digunakan

**Backend (Server & Processing):**
* **Python 3.10.9**
* **FastAPI:** Framework modern untuk server dan WebSocket.
* **OpenCV (cv2):** Pengolahan citra digital.
* **MediaPipe:** Framework Machine Learning untuk deteksi tangan.
* **Uvicorn:** ASGI Server.

**Frontend (User Interface):**
* **ReactJS (Vite):** Framework UI.
* **Three.js & React Three Fiber:** Rendering grafis 3D.
* **TailwindCSS:** Styling antarmuka modern.
* **Framer Motion:** Animasi transisi UI.
* **Lucide-react:** Icon UI

---

## ⚙️ Instalasi & Persiapan

Pastikan perangkat Anda sudah terinstall:
1.  **Python 3.10.9** (Direkomendasikan).
2.  **Node.js** (Versi 16 ke atas).

### 1. Clone Repository

```bash
git clone [https://github.com/farelkdhfi/fullstack-hand-robot-web-app.git](https://github.com/farelkdhfi/fullstack-hand-robot-web-app.git)

cd fullstack-hand-robot-web-app