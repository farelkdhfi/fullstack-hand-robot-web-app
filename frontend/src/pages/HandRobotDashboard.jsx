import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import Webcam from 'react-webcam';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Environment, Text, Sphere } from '@react-three/drei';
import * as THREE from 'three';
// Cari baris import lucide-react, ubah jadi gini:
import { Activity, ScanFace, Target, CheckCircle, Server, Terminal, Layers, BoxIcon, Cpu, Eye } from 'lucide-react';
import { motion } from 'framer-motion';

// --- DEFINISI KONEKSI TANGAN (UNTUK SKELETON) ---
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],     // Jempol
  [0, 5], [5, 6], [6, 7], [7, 8],     // Telunjuk
  [0, 9], [9, 10], [10, 11], [11, 12], // Tengah
  [0, 13], [13, 14], [14, 15], [15, 16], // Manis
  [0, 17], [17, 18], [18, 19], [19, 20], // Kelingking
  [5, 9], [9, 13], [13, 17], [0, 17]   // Telapak
];

// --- VARIANT ANIMASI ---
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 20 }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const scaleIn = {
  hidden: { scale: 0.9, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.4, ease: "easeOut" }
  }
};

// --- 1. KOMPONEN PARTIKEL ---
const ParticleBurst = ({ position, color, onComplete }) => {
  const count = 20;
  const [particles] = useState(() =>
    new Array(count).fill(0).map(() => ({
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.4 + 0.2,
        (Math.random() - 0.5) * 0.4
      ),
      position: new THREE.Vector3(0, 0, 0),
      scale: Math.random() * 0.4 + 0.1,
      life: 1.0
    }))
  );

  const groupRef = useRef();

  useFrame(() => {
    if (!groupRef.current) return;
    let activeCount = 0;

    groupRef.current.children.forEach((mesh, i) => {
      const p = particles[i];
      p.position.add(p.velocity);
      p.velocity.y -= 0.01;
      p.scale *= 0.92;

      mesh.position.copy(p.position);
      mesh.scale.setScalar(p.scale);

      if (p.scale > 0.01) activeCount++;
    });

    if (activeCount === 0 && onComplete) {
      onComplete();
    }
  });

  return (
    <group position={position} ref={groupRef}>
      {particles.map((_, i) => (
        <Sphere key={i} args={[0.2, 6, 6]}>
          <meshBasicMaterial color={color} toneMapped={false} />
        </Sphere>
      ))}
    </group>
  );
};

// --- 2. MECH BONE ---
const MechBone = ({ start, end, isPalm = false }) => {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  const orientation = new THREE.Matrix4();
  orientation.lookAt(start, end, new THREE.Object3D().up);
  orientation.multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
  const quaternion = new THREE.Quaternion().setFromRotationMatrix(orientation);

  const width = isPalm ? 0.5 : 0.15;
  const depth = isPalm ? 0.1 : 0.15;

  return (
    <group position={midpoint} quaternion={quaternion}>
      <mesh>
        <boxGeometry args={[width, length * 0.9, depth]} />
        <meshStandardMaterial color="#fff" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0, depth / 2 + 0.005]}>
        <planeGeometry args={[width * 0.5, length * 0.8]} />
        <meshBasicMaterial color="#000" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

// --- 3. MECH JOINT ---
const MechJoint = ({ position, size = 0.3, isTip = false }) => {
  return (
    <group position={position}>
      <mesh>
        <icosahedronGeometry args={[isTip ? size * 0.6 : size * 0.5, 0]} />
        <meshStandardMaterial
          color={isTip ? "#06b6d4" : "#94a3b8"}
          emissive={isTip ? "#06b6d4" : "#000000"}
          emissiveIntensity={isTip ? 2 : 0}
          metalness={0.9} roughness={0.1}
        />
      </mesh>
    </group>
  );
};

// --- 4. ZONA SORTING ---
const SortingZone = ({ position, color, label }) => {
  const ringRef = useRef();
  useFrame((state, delta) => {
    if (ringRef.current) ringRef.current.rotation.z -= delta * 0.5;
  });

  return (
    <group position={position}>
      <mesh receiveShadow position={[0, 0.1, 0]}>
        <cylinderGeometry args={[2.0, 2.2, 0.2, 32]} />
        <meshStandardMaterial
          color="#0f172a"
          metalness={0.9}
          roughness={0.2}
          envMapIntensity={1.5}
        />
      </mesh>

      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.21, 0]}>
        <ringGeometry args={[1.8, 1.9, 32]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>

      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[1.8, 1.8, 2, 32, 1, true]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.1}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <group position={[0, 2.5, 0]}>
        <Text fontSize={0.5} color="#ffffff" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor={color}>
          {label}
        </Text>
      </group>
    </group>
  );
};

// --- 5. SMART CUBE ---
const SmartCube = ({
  landmarks, isGripping, startPos, color, targetZoneX,
  id, activeId, onGrab, onRelease, onScore, onFail
}) => {
  const meshRef = useRef();
  const [status, setStatus] = useState('IDLE');

  const cubePos = useRef(new THREE.Vector3(...startPos));
  const currentScale = useRef(1);
  const prevHandPos = useRef(new THREE.Vector3(0, 0, 0));
  const isRespawning = useRef(false);

  const triggerReset = useCallback(() => {
    isRespawning.current = true;
    setStatus('IDLE');
    setTimeout(() => {
      cubePos.current.set(...startPos);
      if (meshRef.current) {
        meshRef.current.position.set(...startPos);
        meshRef.current.rotation.set(0, 0, 0);
      }
      isRespawning.current = false;
    }, 2000);
  }, [startPos]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const targetScale = isRespawning.current ? 0 : 1;
    currentScale.current = THREE.MathUtils.lerp(currentScale.current, targetScale, 0.1);
    const s = Math.max(0, currentScale.current);
    meshRef.current.scale.setScalar(s);

    if (isRespawning.current || s < 0.1) return;

    meshRef.current.position.lerp(cubePos.current, 0.2);

    if (status !== 'GRABBED') {
      meshRef.current.rotation.x += delta * 0.5;
      meshRef.current.rotation.y += delta * 0.2;
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 2 + id) * 0.1 + 0.8;
    } else {
      meshRef.current.rotation.set(0, 0, 0);
    }

    if (landmarks && landmarks.length > 0) {
      const thumb = landmarks[4];
      const index = landmarks[8];
      const targetHandX = ((thumb.x + index.x) / 2 - 0.5) * -10;
      const targetHandY = ((thumb.y + index.y) / 2 - 0.5) * -10;
      const targetHandZ = ((thumb.z + index.z) / 2) * -5;
      const targetVec = new THREE.Vector3(targetHandX, targetHandY, targetHandZ);
      prevHandPos.current.lerp(targetVec, 0.2);
      const currentHandPos = prevHandPos.current;
      const distance = meshRef.current.position.distanceTo(currentHandPos);
      const threshold = 1.8;

      if (activeId === id) {
        cubePos.current.copy(currentHandPos);
        setStatus('GRABBED');

        if (!isGripping) {
          onRelease();

          const isCorrect = (targetZoneX < 0 && currentHandPos.x < -1.5) ||
            (targetZoneX > 0 && currentHandPos.x > 1.5);

          if (isCorrect) {
            setStatus('SUCCESS');
            onScore(currentHandPos.clone());
            triggerReset();
          } else if (Math.abs(currentHandPos.x) > 1.5) {
            setStatus('WRONG');
            onFail();
          } else {
            setStatus('IDLE');
          }
        }
      }
      else if (activeId === null) {
        if (distance < threshold) {
          if (status !== 'SUCCESS') {
            setStatus('HOVER');
            if (isGripping) onGrab(id);
          }
        } else {
          if (status !== 'SUCCESS' && status !== 'WRONG' && status !== 'IDLE') setStatus('IDLE');
        }
      }
    }
  });

  const getVisuals = () => {
    switch (status) {
      case 'GRABBED': return { color: '#00ffff', text: 'LOCKED', emissive: 2 };
      case 'HOVER': return { color: '#8ec5ff', text: 'GRAB', emissive: 0.5 };
      case 'SUCCESS': return { color: '#4ade80', text: 'READY', emissive: 1 };
      case 'WRONG': return { color: '#ef4444', text: 'RETRY', emissive: 1 };
      default: return { color: color, text: '', emissive: 0.2 };
    }
  };

  const vis = getVisuals();

  return (
    <group>
      <mesh ref={meshRef} position={startPos}>
        <boxGeometry args={[1.2, 1.2, 1.2]} />
        <meshStandardMaterial
          color="#1e293b"
          metalness={0.9}
          roughness={0.1}
          envMapIntensity={2}
        />
        <mesh scale={[1.02, 1.02, 1.02]}>
          <boxGeometry args={[1.2, 1.2, 1.2]} />
          <meshBasicMaterial
            color={vis.color}
            wireframe={true}
            toneMapped={false}
            transparent
            opacity={0.5}
          />
        </mesh>
        <mesh scale={[0.5, 0.5, 0.5]}>
          <boxGeometry />
          <meshStandardMaterial
            color={vis.color}
            emissive={vis.color}
            emissiveIntensity={vis.emissive}
          />
        </mesh>
        {vis.text && currentScale.current > 0.5 && (
          <Text position={[0, 1.5, 0]} fontSize={0.4} color="white" anchorX="center" anchorY="middle" outlineWidth={0.04} outlineColor="#000">
            {vis.text}
          </Text>
        )}
      </mesh>
    </group>
  );
};

// --- 6. HAND 3D ---
const Hand3D = ({ landmarks }) => {
  const connections = [
    [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8],
    [0, 9], [9, 10], [10, 11], [11, 12], [0, 13], [13, 14], [14, 15], [15, 16],
    [0, 17], [17, 18], [18, 19], [19, 20], [5, 9], [9, 13], [13, 17], [0, 17], [0, 5]
  ];

  if (!landmarks || landmarks.length === 0) return null;

  const prevPoints = useRef(null);
  const targetPoints = useMemo(() => landmarks.map(lm => {
    return new THREE.Vector3((lm.x - 0.5) * -10, (lm.y - 0.5) * -10, lm.z * -5);
  }), [landmarks]);

  if (!prevPoints.current) prevPoints.current = targetPoints;

  const points = targetPoints.map((target, i) => {
    const current = prevPoints.current[i];
    current.lerp(target, 0.25);
    return current.clone();
  });

  prevPoints.current = points;
  const fingerTips = [4, 8, 12, 16, 20];

  return (
    <group position={[0, 0, 0]} rotation={[-0.2, 0, 0]}>
      {connections.map(([start, end], i) => {
        const isPalm = i >= 20;
        return <MechBone key={`bone-${i}`} start={points[start]} end={points[end]} isPalm={isPalm} />;
      })}
      {points.map((pos, index) => {
        const isTip = fingerTips.includes(index);
        const isWrist = index === 0;
        const size = isWrist ? 0.4 : (isTip ? 0.2 : 0.18);
        return <MechJoint key={`joint-${index}`} position={pos} size={size} isTip={isTip} />;
      })}
    </group>
  );
};

// --- 6.5 KOMPONEN VISUALISASI 2D
const Hand2DView = ({ landmarks, gesture, fingerTip, isManual }) => {
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

            // Ubah initial distance jadi Infinity biar pasti ketemu
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
  }, [gesture, landmarks, fingerTip, isManual]); // Dependency penting!

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

// --- 7. (BARU) KOMPONEN CRANE / DEREK ---
const Crane3D = ({ position, isGripping }) => {
  // Posisi default jika data belum ada
  const pos = position ? new THREE.Vector3((position.x - 0.5) * -10, (position.y - 0.5) * -10, 0) : new THREE.Vector3(0, 0, 0);

  // Animasi capit (Claw)
  const clawAngle = isGripping ? 0.8 : 0.2; // Menutup vs Membuka

  return (
    <group position={pos}>
      {/* 1. TALI KABEL (Naik ke atas tanpa batas) */}
      <mesh position={[0, 10, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 20, 8]} />
        <meshStandardMaterial color="#334155" metalness={0.5} />
      </mesh>

      {/* 2. KEPALA DEREK */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.8, 1, 0.8]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.8} roughness={0.2} />
        {/* Lampu Indikator */}
        <mesh position={[0, 0, 0.41]}>
          <circleGeometry args={[0.2, 32]} />
          <meshBasicMaterial color={isGripping ? "#ef4444" : "#22c55e"} />
        </mesh>
      </mesh>

      {/* 3. CAPIT KIRI */}
      <group position={[-0.3, 0, 0]} rotation={[0, 0, -clawAngle]}>
        <mesh position={[0, -0.6, 0]}>
          <boxGeometry args={[0.15, 1.2, 0.3]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
        <mesh position={[0.2, -1.2, 0]} rotation={[0, 0, 1.0]}>
          <boxGeometry args={[0.15, 0.6, 0.3]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
      </group>

      {/* 4. CAPIT KANAN */}
      <group position={[0.3, 0, 0]} rotation={[0, 0, clawAngle]}>
        <mesh position={[0, -0.6, 0]}>
          <boxGeometry args={[0.15, 1.2, 0.3]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
        <mesh position={[-0.2, -1.2, 0]} rotation={[0, 0, -1.0]}>
          <boxGeometry args={[0.15, 0.6, 0.3]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
      </group>
    </group>
  );
};

// --- 8. (BARU) HOOK SUARA ---
// --- 8. (UPDATE) HOOK SUARA SUPER RESPONSIF ---
// --- 8. (FINAL STABLE VERSION) HOOK SUARA ---
const useVoiceCommand = (isActive) => {
  const [voiceGripping, setVoiceGripping] = useState(false);
  const [listeningStatus, setListeningStatus] = useState("OFF");
  const [lastHeard, setLastHeard] = useState("");

  // Gunakan Ref untuk melacak status aktif tanpa memicu render ulang
  const recognitionRef = useRef(null);
  const shouldBeOn = useRef(false); // Flag untuk kontrol restart manual

  useEffect(() => {
    // Jika mode manual dimatikan, stop semuanya
    if (!isActive) {
      setListeningStatus("OFF");
      shouldBeOn.current = false;
      if (recognitionRef.current) recognitionRef.current.stop();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Browser tidak support Speech Recognition");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    shouldBeOn.current = true; // Tandai bahwa kita ingin mic menyala

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setListeningStatus("LISTENING...");
    };

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript.trim().toLowerCase();
        setLastHeard(transcript);

        if (
          transcript.includes("grab") ||
          transcript.includes("close") ||
          transcript.includes("lock") ||
          transcript.includes("up")
        ) {
          setVoiceGripping(true);
        }
        else if (
          transcript.includes("release") ||
          transcript.includes("open") ||
          transcript.includes("drop")
        ) {
          setVoiceGripping(false);
        }
      }
    };

    recognition.onerror = (event) => {
      // Error 'aborted' atau 'no-speech' sering terjadi, abaikan saja
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      console.warn("Mic Error:", event.error);
    };

    recognition.onend = () => {
      // LOGIKA SELF-HEALING:
      // Jika harusnya masih aktif (shouldBeOn), nyalakan lagi setelah jeda singkat
      if (shouldBeOn.current) {
        setListeningStatus("RESTARTING...");
        setTimeout(() => {
          if (shouldBeOn.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              // Ignore error if already started
            }
          }
        }, 300); // Jeda 300ms mencegah error "aborted" loop
      } else {
        setListeningStatus("OFF");
      }
    };

    // Start pertama kali
    try {
      recognition.start();
    } catch (e) { console.error(e); }

    // Cleanup saat komponen di-unmount atau mode berubah
    return () => {
      shouldBeOn.current = false; // Matikan flag restart
      if (recognitionRef.current) {
        recognitionRef.current.abort(); // Matikan paksa
      }
    };
  }, [isActive]);

  return { voiceGripping, listeningStatus, lastHeard };
};

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

  // STATE BARU: View Mode
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

    // 1. GAMBAR KOTAK HIJAU JIKA MODE KALIBRASI
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

  }, [handData]); // <--- Pastikan useEffect jalan tiap handData berubah


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

                {/* TOMBOL 1: GANTI VIEW (2D/3D) - Code lama lu pindahin kesini */}
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

                {/* TOMBOL 2: GANTI ALGORITMA (AI/MANUAL) - INI YANG BARU */}
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

                {/* TOMBOL 3: KALIBRASI WARNA (Hanya muncul kalau bukan mode AI) */}
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
                  // Kita gunakan fingerTip dari Python untuk posisi crane
                  <Crane3D
                    position={handData.fingerTip}
                    isGripping={voiceGripping}
                  />
                )}
                <SmartCube
                  id={1} startPos={[-1, 0, 0]} color="#fee685" targetZoneX={-1}
                  landmarks={handData.landmarks}
                  isGripping={isEffectiveGripping} // <--- UPDATE INI
                  activeId={activeGrabId}
                  onGrab={() => setActiveGrabId(1)}
                  onRelease={() => setActiveGrabId(null)}
                  onScore={handleScore}
                  onFail={handleFail}
                />

                <SmartCube
                  id={2} startPos={[1, 0, 0]} color="#ffffff" targetZoneX={1}
                  landmarks={handData.landmarks}
                  isGripping={isEffectiveGripping} // <--- UPDATE INI
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
              <Hand2DView
                landmarks={handData.landmarks}
                gesture={isEffectiveGripping ? 'GRIPPING' : 'OPEN'}
                fingerTip={handData.fingerTip}
                isManual={algorithmMode === 'MANUAL'}
              />
            )}
          </div>

          {/* --- INDIKATOR SUARA DI UI (UPDATE) --- */}
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