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
```
cd fullstack-hand-robot-web-app

### 2. Setup Backend
Buka terminal di vscode, masuk ke folder backend dan install dependensi Python.

* **Masuk ke direktori backend**
  ketik di terminal:
  ```mark
  cd backend
  ```

* **(Opsional tapi disarankan) Buat Virtual Environment**
  ```bash
  python -m venv venv
  ```

* **Aktifkan Virtual Environment**
  - Windows:
  ```bash
  venv\Scripts\activate
  ```
  - Mac/Linux:
  ```bash
  source venv/bin/activate
  ```
* **Install Library yang dibutuhkan**
```bash
pip install -r requirements.txt
```

### 3. Setup Frontend
Buka terminal baru, masuk ke folder frontend dan install dependensi Node.js.

* **Buka terminal baru, dan ketik ini di terminal untuk masuk ke direktori frontend:**
```bash
cd frontend
```
* **Install packages**
```bash
npm install
```

---

## 🚀 Cara Menjalankan Aplikasi (Running)
Untuk menjalankan sistem, Anda perlu membuka dua terminal secara bersamaan.

* **Terminal 1: Backend Server**
- Pastikan Anda berada di folder backend dan virtual environment aktif (jika ada).
```bash
python backend.py
```
Tunggu hingga muncul pesan: Uvicorn running on http://0.0.0.0:8000

* **Terminal 2: Frontend Client**
- Pastikan Anda berada di folder frontend.
```bash
npm run dev
```
Buka browser (Chrome/Edge) dan akses alamat lokal yang muncul (http://localhost:5173).

---

## 📖 Panduan Penggunaan
* **Akses Kamera:** Izinkan browser mengakses webcam saat diminta.

* **Pilih Mode Algoritma:**
- Mode AI (Default): Langsung arahkan tangan ke kamera. Dekatkan jari telunjuk dan jempol untuk melakukan GRIPPING (mengambil kotak). Jauhkan jari untuk melepas.

- Mode Manual: Klik tombol "ALGO: AI" untuk ganti ke "MANUAL". Klik tombol "CALIBRATE SKIN", letakkan tangan di kotak hijau, dan tunggu proses sampling warna selesai. Untuk melakukan grip pada crane cukup mengucapkan instruksi 'LOCK / CLOSE / GRAB / UP' dan untuk melepaskan 'DROP / RELEASE / OPEN'

- Misi: Pindahkan Kubus Kuning ke zona kuning, dan Kubus Putih ke zona putih.