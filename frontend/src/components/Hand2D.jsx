import React, { useState, useRef, useEffect } from 'react';
import { HAND_CONNECTIONS } from '../utils/handConnections';

const Hand2D = ({ 
  landmarks = [], 
  gesture = 'OPEN', 
  fingerTip = { x: 0.5, y: 0.5 }, // Default ke tengah layar jika data kosong
  isManual = false 
}) => {

  // --- STATE FISIKA (Data gedung) ---
  const [cubes, setCubes] = useState([
    { id: 1, x: 0.2, y: 0.5, width: 0.12, height: 0.25, color: '#fee685', velocityY: 0 },
    { id: 2, x: 0.6, y: 0.5, width: 0.18, height: 0.20, color: '#ffffff', velocityY: 0 },
    { id: 3, x: 0.4, y: 0.2, width: 0.10, height: 0.18, color: '#06b6d4', velocityY: 0 },
  ]);

  const heldCubeId = useRef(null);
  const GRAVITY = 0.0005;
  const BOUNCE = 0.2;
  const FLOOR_LEVEL = 0.95;

  // --- LOOP UTAMA FISIKA ---
  useEffect(() => {
    let animationFrameId;

    const updatePhysics = () => {
      setCubes(prevCubes => {
        let newCubes = prevCubes.map(c => ({ ...c }));

        let fingerX = 0.5;
        let fingerY = 0.5;
        let hasHand = false;

        // --- 1. TENTUKAN POSISI KURSOR (AI vs MANUAL) ---
        if (isManual) {
          // Jika Manual: Pakai fingerTip dari Python (hasil CV2 atau Kalibrasi)
          fingerX = fingerTip.x;
          fingerY = fingerTip.y;
          hasHand = true; // Di mode manual, kita anggap kursor selalu ada
        } else {
          // Jika AI: Pakai landmarks jari telunjuk (Index Tip = 8)
          if (landmarks && landmarks.length > 0 && landmarks[8]) {
            fingerX = landmarks[8].x;
            fingerY = landmarks[8].y;
            hasHand = true;
          }
        }

        // --- 2. LOGIKA GRABBING ---
        // 1. LOGIKA GRABBING (Hanya jalan jika ada tangan/kursor)
        if (hasHand && gesture === 'GRIPPING') {
          if (heldCubeId.current === null) {

            // initial distance Infinity biar pasti ketemu
            let closestDist = Infinity;
            let targetId = null;

            // Margin toleransi (biar ngegrip di pinggir-pinggir dikit masih kena)
            const GRAB_MARGIN = 0.05;

            newCubes.forEach(cube => {
              // LOGIKA BARU: BOUNDING BOX (KOTAK)
              // Cek apakah jari ada di dalam rentang X bangunan
              const isInsideX = fingerX > (cube.x - GRAB_MARGIN) &&
                fingerX < (cube.x + cube.width + GRAB_MARGIN);

              // Cek apakah jari ada di dalam rentang Y bangunan
              const isInsideY = fingerY > (cube.y - GRAB_MARGIN) &&
                fingerY < (cube.y + cube.height + GRAB_MARGIN);

              // Jika masuk dalam area kotak
              if (isInsideX && isInsideY) {
                // Kita tetap hitung jarak ke pusat HANYA untuk prioritas
                // (Misal ada 2 gedung numpuk, ambil yang pusatnya paling dekat)
                const centerX = cube.x + cube.width / 2;
                const centerY = cube.y + cube.height / 2;
                const dist = Math.sqrt(Math.pow(centerX - fingerX, 2) + Math.pow(centerY - fingerY, 2));

                if (dist < closestDist) {
                  closestDist = dist;
                  targetId = cube.id;
                }
              }
            });

            if (targetId !== null) {
              heldCubeId.current = targetId;
            }
          }
        } else {
          // Jika gesture bukan gripping, lepas objek
          heldCubeId.current = null;
        }

        // --- 3. LOGIKA GERAKAN & TUMPUKAN (COLLISION) ---
        newCubes.forEach(cube => {
          if (cube.id === heldCubeId.current) {
            // Objek mengikuti jari/crane
            cube.x = fingerX - cube.width / 2;
            cube.y = fingerY - cube.height * 0.2;
            cube.velocityY = 0;
          }
          else {
            // Gravitasi normal
            cube.velocityY += GRAVITY;
            cube.y += cube.velocityY;

            // Lantai
            if (cube.y + cube.height > FLOOR_LEVEL) {
              cube.y = FLOOR_LEVEL - cube.height;
              cube.velocityY *= -BOUNCE;
            }

            // Tabrakan antar kubus
            newCubes.forEach(otherCube => {
              if (cube.id !== otherCube.id) {
                if (
                  cube.x < otherCube.x + otherCube.width - 0.01 &&
                  cube.x + cube.width > otherCube.x + 0.01 &&
                  cube.y < otherCube.y + otherCube.height &&
                  cube.y + cube.height > otherCube.y
                ) {
                  const isOnTop = (cube.y + cube.height) - (otherCube.y + otherCube.height / 2) < 0.1;

                  if (isOnTop && cube.velocityY > 0) {
                    cube.y = otherCube.y - cube.height;
                    cube.velocityY = 0;
                  }
                }
              }
            });
          }
        });

        return newCubes;
      });

      animationFrameId = requestAnimationFrame(updatePhysics);
    };

    animationFrameId = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gesture, landmarks, fingerTip, isManual]);

  // --- HELPER RENDER JENDELA GEDUNG ---
  const renderWindows = (cube) => {
    const windows = [];
    const winW = 0.02; const winH = 0.03;
    const gapX = 0.01; const gapY = 0.015;
    const margin = 0.015;
    const cols = Math.floor((cube.width - margin * 2) / (winW + gapX));
    const rows = Math.floor((cube.height - margin * 2 - 0.02) / (winH + gapY));

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        windows.push(
          <rect key={`w-${cube.id}-${r}-${c}`} x={cube.x + margin + c * (winW + gapX)} y={cube.y + margin + 0.02 + r * (winH + gapY)} width={winW} height={winH} fill="#a5f3fc" fillOpacity="0.6" />
        );
      }
    }
    return windows;
  };

  return (
    <div className="w-full h-full bg-neutral-900 relative flex items-center justify-center p-10 overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-linear-to-b from-neutral-900 via-neutral-900 to-black"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-size-[40px_40px]"></div>

      {/* Overlay Status: Hanya muncul di mode AI jika tangan tidak terdeteksi */}
      {(!isManual && (!landmarks || landmarks.length === 0)) && (
        <div className="absolute top-10 left-1/2 transform -translate-x-1/2 z-30 bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm border border-cyan-500/30">
          <p className="text-cyan-400 font-mono text-xs animate-pulse">WAITING FOR HAND DETECTION...</p>
        </div>
      )}

      {/* SVG Container Utama */}
      <svg className="w-full h-full max-w-lg max-h-lg z-10 drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)]" viewBox="0 0 1 1" style={{ transform: 'scaleX(-1)' }}>

        {/* 1. RENDER GEDUNG (Selalu muncul) */}
        {cubes.map(cube => {
          const isHeld = cube.id === heldCubeId.current;
          return (
            <g key={cube.id} className={isHeld ? "transition-transform duration-75" : "transition-all duration-300 ease-out"}>
              <rect x={cube.x} y={cube.y} width={cube.width} height={cube.height} fill="#000" stroke={cube.color} strokeWidth={isHeld ? "0.008" : "0.002"} />
              <rect x={cube.x} y={cube.y} width={cube.width} height="0.02" fill={cube.color} />
              {renderWindows(cube)}
              <text x={cube.x + cube.width / 2} y={cube.y + cube.height / 2} fontSize="0.04" fontWeight="bold" fill={cube.color} textAnchor="middle" alignmentBaseline="middle" style={{ transform: 'scaleX(-1)', transformOrigin: `${cube.x + cube.width / 2}px ${cube.y + cube.height / 2}px` }}>
                B-{cube.id}
              </text>
            </g>
          );
        })}

        {/* 2. RENDER LANTAI */}
        <rect x="0" y="0.95" width="1" height="0.05" fill="#000" stroke="#475569" strokeWidth="0.01" />
        <line x1="0" y1="0.95" x2="1" y2="0.95" stroke={gesture === 'GRIPPING' ? '#fbbf24' : '#fff'} strokeWidth="0.005" className="transition-colors duration-300" />

        {/* 3. RENDER PEMAIN (CRANE atau TANGAN) */}
        {isManual ? (
          // === OPSI A: TAMPILAN CRANE (Manual Mode) ===
          <g className="transition-all duration-75 ease-linear">
            {/* Tali Kabel dari langit-langit */}
            <line x1={fingerTip.x} y1={0} x2={fingerTip.x} y2={fingerTip.y} stroke="#475569" strokeWidth="0.005" />

            {/* Kepala Crane Box */}
            <rect x={fingerTip.x - 0.04} y={fingerTip.y - 0.04} width={0.08} height={0.06} fill="#f59e0b" stroke="#fff" strokeWidth="0.002" rx="0.01" />

            {/* Lampu Indikator Status (Hijau/Merah) */}
            <circle cx={fingerTip.x} cy={fingerTip.y - 0.01} r={0.01} fill={gesture === 'GRIPPING' ? '#ef4444' : '#22c55e'} />

            {/* Capit Kiri (Animasi Rotasi) */}
            <path
              d={`M ${fingerTip.x - 0.03} ${fingerTip.y + 0.02} L ${fingerTip.x - 0.03} ${fingerTip.y + 0.08} L ${fingerTip.x - 0.01} ${fingerTip.y + 0.08}`}
              fill="none" stroke="#94a3b8" strokeWidth="0.008"
              transform={`rotate(${gesture === 'GRIPPING' ? -20 : 0}, ${fingerTip.x - 0.03}, ${fingerTip.y + 0.02})`}
            />
            {/* Capit Kanan (Animasi Rotasi) */}
            <path
              d={`M ${fingerTip.x + 0.03} ${fingerTip.y + 0.02} L ${fingerTip.x + 0.03} ${fingerTip.y + 0.08} L ${fingerTip.x + 0.01} ${fingerTip.y + 0.08}`}
              fill="none" stroke="#94a3b8" strokeWidth="0.008"
              transform={`rotate(${gesture === 'GRIPPING' ? 20 : 0}, ${fingerTip.x + 0.03}, ${fingerTip.y + 0.02})`}
            />
          </g>
        ) : (
          // === OPSI B: TAMPILAN SKELETON (AI Mode) ===
          landmarks && landmarks.length > 0 && (
            <>
              {/* Garis Tulang */}
              {HAND_CONNECTIONS.map(([start, end], i) => {
                const p1 = landmarks[start];
                const p2 = landmarks[end];
                if (!p1 || !p2) return null;
                return <line key={`line-${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={gesture === 'GRIPPING' ? '#fbbf24' : '#fff'} strokeWidth="0.012" strokeLinecap="round" opacity="0.8" />;
              })}
              {/* Titik Sendi */}
              {landmarks.map((lm, i) => (
                <circle key={`joint-${i}`} cx={lm.x} cy={lm.y} r={i === 8 ? 0.02 : 0.01} fill={i === 8 ? (gesture === 'GRIPPING' ? '#fbbf24' : '#fff') : (i === 4 ? '#ffffff' : '#0f172a')} stroke={gesture === 'GRIPPING' ? '#fbbf24' : '#fff'} strokeWidth="0.005" />
              ))}
            </>
          )
        )}
      </svg>

      {/* Info Status Pojok Kiri Bawah */}
      <div className="absolute bottom-4 left-4 font-mono text-xs z-20 bg-black/50 p-2 rounded">
        <p className="text-neutral-500">MODE: <span className="text-white font-bold">CITY BUILDER 2D ({isManual ? 'MANUAL CRANE' : 'AI HAND'})</span></p>
        <p className="text-neutral-500">STATUS: <span className={heldCubeId.current ? "text-amber-400 animate-pulse" : "text-emerald-400"}>
          {heldCubeId.current ? `MOVING BLDG B-${heldCubeId.current}` : "READY TO BUILD"}
        </span></p>
      </div>
    </div>
  );
};

export default Hand2D;