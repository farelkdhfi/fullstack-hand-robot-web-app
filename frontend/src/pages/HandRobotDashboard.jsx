import React, { useRef, useEffect, useState, useMemo } from 'react';
import Webcam from 'react-webcam';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Environment } from '@react-three/drei';
import { Activity, ScanFace, Target, CheckCircle, Server, Terminal, Layers, BoxIcon, Cpu, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import ParticleBurst from '../components/ParticleBurst';
import SortingZone from '../components/SortingZone';
import SmartCube from '../components/SmartCube';
import Hand3D from '../components/Hand3D';
import Crane3D from '../components/Crane3D';
import { HAND_CONNECTIONS } from '../utils/handConnections';
import { useVoiceCommand } from '../utils/useVoiceCommand';
import Hand2D from '../components/Hand2D';
import { fadeInUp, scaleIn, staggerContainer } from '../utils/variantAnimation';

// --- VARIANT ANIMASI ---


// --- 7. DASHBOARD UTAMA (PYTHON INTEGRATED) ---
const HandRobotDashboard = () => {
  const webcamRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const ws = useRef(null);
  const [activeGrabId, setActiveGrabId] = useState(null);
  const [score, setScore] = useState(0);
  const [explosions, setExplosions] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [serverLogs, setServerLogs] = useState([]);

  // State View Mode
  const [viewMode, setViewMode] = useState('3D');
  const [algorithmMode, setAlgorithmMode] = useState('AI'); // Default AI
  const [handData, setHandData] = useState({
    landmarks: [],
    systemStatus: 'CONNECTING...',
    confidence: 0,
    gesture: 'NONE',
    handedness: 'N/A',
    fingerTip: { x: 0, y: 0, z: 0 }
  });

  // Ambil variabel lastHeard juga
  const { voiceGripping, listeningStatus, lastHeard } = useVoiceCommand(algorithmMode === 'MANUAL');

  const isEffectiveGripping = useMemo(() => {
    if (algorithmMode === 'AI') {
      return handData.gesture === 'GRIPPING';
    } else {
      return voiceGripping;
    }
  }, [algorithmMode, handData.gesture, voiceGripping]);

  // --- LOGIKA MENGGAMBAR SKELETON & KOTAK KALIBRASI ---
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Bersihkan canvas
    ctx.clearRect(0, 0, width, height);

    // GAMBAR KOTAK HIJAU JIKA MODE KALIBRASI
    // Kita cek apakah mode mengandung kata "CALIBRAT" biar aman
    if (handData.mode && handData.mode.includes('CALIBRAT')) {
      const cx = width / 2;
      const cy = height / 2;
      const size = 120;

      ctx.save();
      ctx.lineWidth = 4;
      ctx.setLineDash([15, 5]);

      // UBAH WARNA BERDASARKAN STATUS
      if (handData.mode === 'CALIBRATING_SCAN') {
        ctx.strokeStyle = "#fbbf24"; // Kuning/Amber saat sampling
        ctx.fillStyle = "#fbbf24";
        ctx.fillText("DON'T MOVE!", cx, cy - size / 2 - 15);
      } else {
        ctx.strokeStyle = "#4ade80"; // Hijau saat menunggu
        ctx.fillStyle = "#4ade80";
        ctx.fillText("PLACE HAND HERE", cx, cy - size / 2 - 15);
      }

      ctx.strokeRect(cx - size / 2, cy - size / 2, size, size);

      // Tampilkan pesan status dari backend (hitung mundur)
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "center";
      ctx.shadowColor = "black";
      ctx.shadowBlur = 4;
      ctx.fillText(handData.gesture, cx, cy + size / 2 + 25); // Ini bakal nampilin hitung mundur

      ctx.restore();
    }

    // 2. GAMBAR SKELETON TANGAN (Logic lama)
    if (handData.landmarks && handData.landmarks.length > 0) {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // A. Gambar Garis (BONES)
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#ffffff";
      ctx.beginPath();
      HAND_CONNECTIONS.forEach(([start, end]) => {
        const p1 = handData.landmarks[start];
        const p2 = handData.landmarks[end];
        if (p1 && p2) { // Cek existensi dulu
          ctx.moveTo(p1.x * width, p1.y * height);
          ctx.lineTo(p2.x * width, p2.y * height);
        }
      });
      ctx.stroke();

      // B. Gambar Sendi (JOINTS)
      handData.landmarks.forEach((lm) => {
        const x = lm.x * width;
        const y = lm.y * height;
        ctx.beginPath();
        ctx.fillStyle = "#fbbf24";
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
      });
    }

  }, [handData]);


  // --- WEBSOCKET CONNECTION & CAPTURE LOOP ---
  useEffect(() => {
    ws.current = new WebSocket("ws://localhost:8000/ws");

    ws.current.onopen = () => {
      console.log("Connected to Python Backend");
      setIsConnected(true);
      setHandData(prev => ({ ...prev, systemStatus: 'WAITING INPUT' }));
    };

    ws.current.onclose = () => {
      console.log("Disconnected from Python");
      setIsConnected(false);
      setHandData(prev => ({ ...prev, systemStatus: 'OFFLINE' }));
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // --- LOGIC PENERIMAAN LOG DARI PYTHON ---
      if (data.logs && data.logs.length > 0) {
        setServerLogs(prevLogs => {
          return [...data.logs, ...prevLogs].slice(0, 50);
        });
      }

      if (data.mode) {
        // Pastikan UI kita sinkron sama status asli di Python
        setAlgorithmMode(data.mode);
      }

      setHandData({
        landmarks: data.landmarks,
        systemStatus: data.landmarks.length > 0 ? 'TRACKING ACTIVE' : 'SEARCHING...',
        confidence: data.confidence,
        gesture: data.gesture,
        handedness: data.handedness,
        fingerTip: data.fingerTip,
        mode: data.mode
      });
    };

    // Loop kirim frame
    const interval = setInterval(() => {
      if (ws.current.readyState === WebSocket.OPEN && webcamRef.current) {
        const imageSrc = webcamRef.current.getScreenshot();
        if (imageSrc) {
          ws.current.send(imageSrc);
        }
      }
    }, 50);

    return () => {
      clearInterval(interval);
      if (ws.current) ws.current.close();
    };
  }, []);

  const handleScore = (position) => {
    setScore(s => s + 100);
    setExplosions(prev => [...prev, { id: Date.now(), position, color: '#4ade80' }]);
  };

  const handleFail = () => {
    setScore(s => Math.max(0, s - 50));
  };

  const removeExplosion = (id) => {
    setExplosions(prev => prev.filter(e => e.id !== id));
  };

  const toggleAlgorithm = () => {
    const newMode = algorithmMode === 'AI' ? 'MANUAL' : 'AI';

    // 1. Update UI React dulu biar cepet (Optimistic UI)
    setAlgorithmMode(newMode);

    // 2. Kirim perintah ke Python via WebSocket
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(`MODE:${newMode}`);
      console.log(`Sent command: MODE:${newMode}`);
    }
  };

  const startCalibration = () => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send("MODE:CALIBRATE");
      // Kita set manual dulu di UI, nanti backend akan handle logicnya
      setAlgorithmMode('CALIBRATING...');
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      className="flex flex-col h-screen bg-black text-white p-2 sm:p-4 overflow-hidden selection:bg-cyan-500/30 font-sans"
    >

      {/* HEADER */}
      <motion.header
        variants={fadeInUp}
        className="flex justify-between items-center mb-3 sm:mb-4 z-10 shrink-0"
      >
        <div className="flex items-center gap-3">
          <div>
            <motion.h1
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className='text-xl sm:text-2xl md:text-3xl bg-linear-to-br from-white via-white to-neutral-500 bg-clip-text text-transparent font-bold'
            >
              Touchless Hand Robot Control.
            </motion.h1>
            <motion.p
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-[10px] sm:text-xs text-neutral-500 mt-1"
            >
              TUGAS PROJECT UAS VISI KOMPUTER DAN ROBOTIKA
            </motion.p>
          </div>
        </div>
        <div className="flex gap-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.5 }}
            className={`flex items-center gap-2 text-xs ${isConnected ? 'text-emerald-400' : 'text-red-500'} font-mono`}
          >
            <Server size={14} className={isConnected ? "animate-pulse" : ""} />
            {isConnected ? "PYTHON CONNECTED" : "SERVER OFFLINE"}
          </motion.div>
        </div>
      </motion.header>

      {/* CONTENT AREA */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-6 min-h-0 overflow-hidden">

        {/* SIDEBAR */}
        <motion.aside
          variants={staggerContainer}
          className="w-full lg:w-[350px] xl:w-[400px] flex flex-col gap-4 overflow-hidden shrink-0"
        >

          {/* WEBCAM FEED */}
          <motion.div
            variants={scaleIn}
            className="relative rounded-xl overflow-hidden bg-neutral-900 border border-white/10 shadow-lg aspect-video shrink-0 z-10"
          >
            <Webcam
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              width={640}
              height={480}
              className="absolute top-0 left-0 scale-x-[-1] w-full h-full object-cover"
              controls={false}
            />

            <canvas
              ref={overlayCanvasRef}
              width={640}
              height={480}
              className="absolute scale-x-[-1] top-0 left-0 w-full h-full object-cover pointer-events-none"
            />

            <div className="absolute top-0 left-0 w-full h-full pointer-events-none border-2 border-white/5 box-border z-20">
              <div className="absolute animate-pulse bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-[10px] font-mono text-white/50">
                SENDING FRAMES TO PYTHON...
              </div>
              <div className="absolute flex justify-center items-center top-2 animate-pulse left-2 bg-black/70 px-2 py-1 rounded text-[10px] font-mono text-white/50">
                <div className='flex justify-center items-center gap-x-1'>
                  <p className='w-2 h-2 rounded-full bg-red-500'></p>
                  <p>CAM-EL</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* STATS AREA */}
          <motion.div
            variants={fadeInUp}
            className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-2 flex flex-col"
          >
            <motion.div
              variants={staggerContainer}
              className="bg-neutral-900/50 p-4 rounded-xl space-y-4 backdrop-blur-sm border border-white/5 flex flex-col flex-1"
            >
              <motion.h3 variants={fadeInUp} className="text-white flex items-center gap-2 text-xs font-bold uppercase tracking-wider sticky top-0 bg-neutral-900/0 backdrop-blur-md py-2 z-10 -mt-2">
                <Activity size={14} className="text-amber-200" /> Backend Diagnostics
              </motion.h3>

              {/* Score Card */}
              <motion.div
                variants={fadeInUp}
                className="bg-black/80 p-4 rounded-xl shadow-inner border border-white/5 flex items-center justify-between shrink-0"
              >
                <div>
                  <p className="text-[10px] text-neutral-400 uppercase font-mono">Correct Performance</p>
                  <motion.p
                    key={score}
                    initial={{ scale: 1.5, color: "#4ade80" }}
                    animate={{ scale: 1, color: "#ffffff" }}
                    className="text-xl font-semibold text-white glow-text tabular-nums"
                  >
                    {score}
                  </motion.p>
                </div>
                <CheckCircle size={32} className="text-amber-100/80" />
              </motion.div>

              {/* Grid Stats */}
              <div className="grid grid-cols-2 gap-3 shrink-0">
                <motion.div
                  variants={fadeInUp}
                  className={`px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold flex justify-center items-center text-center transition-all duration-300 border ${handData.gesture === 'GRIPPING' ? 'bg-amber-500/20 border-amber-500/50 text-amber-200' : 'bg-white/5 border-white/5 text-neutral-400'}`}
                >
                  PYTHON DETECT: <br /> {handData.gesture}
                </motion.div>

                <motion.div variants={fadeInUp} className="p-2 rounded-xl bg-white/5 border border-white/5">
                  <p className="text-[9px] text-neutral-400 uppercase font-mono">Confidence</p>
                  <div className="flex items-baseline gap-1">
                    <p className={`text-sm font-bold ${handData.confidence > 80 ? 'text-emerald-400' : 'text-yellow-500'}`}>
                      {handData.confidence}%
                    </p>
                  </div>
                </motion.div>

                {/* HAND ID & SWITCH BUTTON */}
                <motion.div variants={fadeInUp} className="p-2 rounded-xl bg-white/5 border border-white/5 relative group">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[9px] text-neutral-400 uppercase font-mono">Hand ID</p>
                      <p className="text-sm font-bold text-white flex items-center gap-2 mt-1">
                        <ScanFace size={14} className="text-slate-400" /> {handData.handedness}
                      </p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  variants={fadeInUp}
                  className="col-span-1 bg-white/5 p-2 rounded-xl border border-white/5 flex items-center justify-between"
                >
                  <div className="flex flex-col gap-y-1 p-1">
                    <p className="text-[9px] text-neutral-400 uppercase font-mono">Interaction</p>
                    <div className='flex items-center gap-x-2'>
                      <Target size={14} className={activeGrabId ? "text-amber-200 animate-pulse" : "text-slate-600"} />
                      <p className={`text-xs font-bold truncate ${activeGrabId ? 'text-amber-200' : 'text-neutral-500'}`}>
                        {activeGrabId ? `ID: ${activeGrabId}` : 'IDLE'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>

              <div className="p-2 mt-2 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-2">

                {/* LABEL HEADER */}
                <p className="text-[9px] text-neutral-400 uppercase font-mono px-1">Control Panel</p>

                {/* TOMBOL GANTI VIEW (2D/3D) */}
                <button
                  onClick={() => setViewMode(prev => prev === '3D' ? '2D' : '3D')}
                  className="p-2 flex items-center w-full gap-x-3 rounded-lg bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-400 transition-all border border-white/5 active:scale-95 text-xs font-bold"
                >
                  {viewMode === '3D' ? <Layers size={16} /> : <BoxIcon size={16} />}
                  <div className="flex flex-col items-start">
                    <span>VIEW: {viewMode}</span>
                    <span className="text-[9px] font-normal text-neutral-400 opacity-70">Visualisasi Tangan</span>
                  </div>
                </button>

                {/* TOMBOL GANTI ALGORITMA (AI/MANUAL) */}
                <button
                  onClick={toggleAlgorithm}
                  className={`p-2 flex items-center w-full gap-x-3 rounded-lg transition-all border active:scale-95 text-xs font-bold ${algorithmMode === 'AI'
                    ? 'bg-purple-500/10 border-purple-500/30 text-purple-300 hover:bg-purple-500/20'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                    }`}
                >
                  {algorithmMode === 'AI' ? <Cpu size={16} /> : <Eye size={16} />}
                  <div className="flex flex-col items-start">
                    <span>ALGO: {algorithmMode}</span>
                    <span className="text-[9px] font-normal opacity-70">
                      {algorithmMode === 'AI' ? 'Deep Learning (MediaPipe)' : 'Manual CV (Contours)'}
                    </span>
                  </div>
                </button>

                {/* TOMBOL KALIBRASI WARNA (Hanya muncul kalau bukan mode AI) */}
                {algorithmMode !== 'AI' && (
                  <button
                    onClick={startCalibration}
                    className="p-2 mt-1 flex items-center w-full gap-x-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-300 hover:bg-green-500/20 transition-all active:scale-95 text-xs font-bold"
                  >
                    <ScanFace size={16} />
                    <div className="flex flex-col items-start">
                      <span>CALIBRATE SKIN</span>
                      <span className="text-[9px] font-normal opacity-70">
                        Arahkan tangan ke tengah
                      </span>
                    </div>
                  </button>
                )}
              </div>

              {/* LOG TERMINAL */}
              <motion.div variants={fadeInUp} className="mt-2 flex-1 flex flex-col min-h-[150px]">
                <h4 className="text-[10px] text-neutral-400 uppercase font-mono mb-2 flex items-center gap-2">
                  <Terminal size={12} className="text-emerald-500" />
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Server Logs
                </h4>

                <div className="flex-1 bg-black/90 rounded-lg border border-white/10 p-2 font-mono text-[9px] sm:text-[10px] overflow-y-auto custom-scrollbar shadow-inner h-32">
                  {serverLogs.length === 0 ? (
                    <p className="text-neutral-600 italic">Waiting for server events...</p>
                  ) : (
                    serverLogs.map((log, index) => {
                      const getLogColor = (type) => {
                        switch (type) {
                          case 'SUCCESS': return 'text-emerald-400';
                          case 'WARNING': return 'text-amber-400';
                          case 'ERROR': return 'text-red-500';
                          case 'INFO': return 'text-cyan-400';
                          case 'SYSTEM': return 'text-purple-400';
                          case 'NEUTRAL': return 'text-neutral-400';
                          default: return 'text-white';
                        }
                      };

                      return (
                        <div key={index} className={`mb-1 border-b border-white/5 pb-0.5 last:border-0 wrap-break-word ${getLogColor(log.type)}`}>
                          <span className="opacity-50 mr-2">[{log.time}]</span>
                          {log.message}
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>

            </motion.div>
          </motion.div>
        </motion.aside>

        {/* MAIN CANVAS AREA */}
        <motion.section
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "circOut" }}
          className="flex-1 relative bg-linear-to-br from-neutral-900 to-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl group min-h-[300px]"
        >
          {/* RENDER KONDISIONAL BERDASARKAN VIEWMODE */}
          <div className="absolute inset-0">
            {viewMode === '3D' ? (
              <Canvas camera={{ position: [0, 4, 16], fov: 40 }} shadows resize={{ scroll: false }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1.5} color="#06b6d4" />
                <pointLight position={[-10, -5, -10]} intensity={1} color="#ec4899" />
                <Environment preset="city" />
                <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />

                <SortingZone position={[-4.5, -2, 0]} color="#fee685" />
                <SortingZone position={[4.5, -2, 0]} color="#ffffff" />

                {algorithmMode === 'AI' ? (
                  // Tampilkan Tangan Robot jika Mode AI
                  <Hand3D landmarks={handData.landmarks} />
                ) : (
                  // Tampilkan Crane jika Mode Manual
                  // Menggunakan fingerTip dari Python untuk posisi crane
                  <Crane3D
                    position={handData.fingerTip}
                    isGripping={voiceGripping}
                  />
                )}
                <SmartCube
                  id={1} startPos={[-1, 0, 0]} color="#fee685" targetZoneX={-1}
                  landmarks={handData.landmarks}
                  isGripping={isEffectiveGripping}
                  activeId={activeGrabId}
                  onGrab={() => setActiveGrabId(1)}
                  onRelease={() => setActiveGrabId(null)}
                  onScore={handleScore}
                  onFail={handleFail}
                />

                <SmartCube
                  id={2} startPos={[1, 0, 0]} color="#ffffff" targetZoneX={1}
                  landmarks={handData.landmarks}
                  isGripping={isEffectiveGripping}
                  activeId={activeGrabId}
                  onGrab={() => setActiveGrabId(2)}
                  onRelease={() => setActiveGrabId(null)}
                  onScore={handleScore}
                  onFail={handleFail}
                />

                {explosions.map(ex => (
                  <ParticleBurst key={ex.id} position={ex.position} color={ex.color} onComplete={() => removeExplosion(ex.id)} />
                ))}

                <OrbitControls enableZoom={true} enablePan={false} minDistance={10} maxDistance={25} autoRotate={false} maxPolarAngle={Math.PI / 2 - 0.1} />
              </Canvas>
            ) : (
              <Hand2D
                landmarks={handData.landmarks}
                gesture={isEffectiveGripping ? 'GRIPPING' : 'OPEN'}
                fingerTip={handData.fingerTip}
                isManual={algorithmMode === 'MANUAL'}
              />
            )}
          </div>

          {/* --- INDIKATOR SUARA --- */}
          {algorithmMode === 'MANUAL' && (
            <div className="absolute top-4 opacity-80 left-29 transform -translate-x-1/2 bg-black/80 backdrop-blur-md px-6 py-3 rounded-2xl border border-amber-500/50 flex flex-col items-center z-50 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
              <p className="text-[10px] text-amber-500 font-mono tracking-widest mb-1 animate-pulse">VOICE CONTROL ACTIVE</p>

              <div className="flex items-center gap-4 mb-1">
                {/* Status Visual */}
                <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${voiceGripping ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-green-500/20 text-green-400 border border-green-500/50'}`}>
                  <div className={`w-2 h-2 rounded-full ${voiceGripping ? 'bg-red-500' : 'bg-green-500'}`}></div>
                  <p className="font-bold text-sm">
                    {voiceGripping ? "GRIPPING" : "RELEASED"}
                  </p>
                </div>
              </div>

              {/* Feedback Teks (Apa yang didengar) */}
              <p className="text-[10px] text-neutral-400 mt-1 font-mono">
                Heard: <span className="text-white">"{lastHeard || "..."}"</span>
              </p>

              <ul className='mt-5 list-disc space-y-2'>
                <li className='text-[10px] text-neutral-500'>
                  <p>Voice Command for GRIPPING:</p>
                  <p className="">Say: <strong>"GRAB / UP /CLOSE / LOCK"</strong></p>
                </li>

                <li className='text-[10px] text-neutral-500'>
                  <p>Voice Command for RELEASE:</p>
                  <p className="">Say: <strong>"DROP / RELEASE /OPEN"</strong></p>
                </li>
              </ul>

            </div>
          )}

          {!isConnected && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
              <div className="text-center">
                <h2 className="text-red-500 font-bold text-xl mb-2">PYTHON SERVER DISCONNECTED</h2>
                <p className="text-gray-400 text-sm">Please start backend.py</p>
              </div>
            </div>
          )}
        </motion.section>
      </div>
    </motion.div>
  );
};

export default HandRobotDashboard;