import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import Webcam from 'react-webcam';
import { Hands, HAND_CONNECTIONS } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Environment, Text, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { Wifi, Activity, ScanFace, Box, Lock, Target, CheckCircle } from 'lucide-react';
// Import Framer Motion
import { motion, AnimatePresence } from 'framer-motion';

// --- VARIANT ANIMASI (ELEGANT PRESETS) ---
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

// --- 1. KOMPONEN PARTIKEL (TETAP) ---
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

// --- 2. MECH BONE (LOW POLY) (TETAP) ---
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

// --- 3. MECH JOINT (TETAP) ---
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

// --- 4. ZONA SORTING (TETAP) ---
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

// --- 5. SMART CUBE (TETAP) ---
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

// --- 6. HAND 3D (TETAP) ---
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

// --- 7. DASHBOARD UTAMA (UPDATED DENGAN FRAMER MOTION) ---
const HandRobotDashboard = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [activeGrabId, setActiveGrabId] = useState(null);
  const [score, setScore] = useState(0);
  const [explosions, setExplosions] = useState([]);

  const [handData, setHandData] = useState({
    landmarks: [],
    systemStatus: 'IDLE',
    confidence: 0,
    gesture: 'NONE',
    handedness: 'N/A',
    fingerTip: { x: 0, y: 0, z: 0 }
  });

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

  const onResults = useCallback((results) => {
    const video = webcamRef.current?.video;
    const canvas = canvasRef.current;

    if (video && canvas) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        for (const landmarks of results.multiHandLandmarks) {
          drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: '#fff', lineWidth: 2 });
          drawLandmarks(ctx, landmarks, { color: '#ffd230', lineWidth: 1, radius: 3 });
        }
      }
      ctx.restore();
    }

    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      setHandData(prev => ({ ...prev, systemStatus: 'SEARCHING...', landmarks: [] }));
      return;
    }

    const landmarks = results.multiHandLandmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const distance = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
    const isGripping = distance < 0.08;

    const handInfo = results.multiHandedness[0].label === 'Right' ? 'LEFT' : 'RIGHT';

    setHandData({
      landmarks: landmarks,
      systemStatus: 'TRACKING ACTIVE',
      confidence: Math.round(results.multiHandedness[0].score * 100),
      gesture: isGripping ? 'GRIPPING' : 'OPEN HAND',
      handedness: handInfo,
      fingerTip: { x: indexTip.x.toFixed(2), y: indexTip.y.toFixed(2), z: indexTip.z ? indexTip.z.toFixed(2) : '0.00' }
    });
  }, []);

  useEffect(() => {
    const hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
    hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
    hands.onResults(onResults);

    if (webcamRef.current && webcamRef.current.video) {
      const camera = new Camera(webcamRef.current.video, {
        onFrame: async () => { if (webcamRef.current && webcamRef.current.video) await hands.send({ image: webcamRef.current.video }); },
        width: 640, height: 480
      });
      camera.start();
    }
  }, [onResults]);

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      className="flex flex-col h-screen bg-black text-white p-2 sm:p-4 overflow-hidden selection:bg-cyan-500/30 font-sans"
    >
      
      {/* HEADER - ANIMATED */}
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
              className='text-xl sm:text-2xl md:text-3xl bg-linear-120 from-amber-100 to-white bg-clip-text text-transparent font-bold'
            >
              Hand Robot Simulation
            </motion.h1>
            <motion.p 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-[10px] sm:text-xs text-neutral-500 mt-1"
            >
              PROJECT UAS VISI KOMPUTER DAN ROBOTIKA
            </motion.p>
          </div>
        </div>
        <div className="flex gap-4">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.5 }}
            className="flex items-center gap-2 text-xs text-emerald-400 font-mono"
          >
            <Wifi size={14} className="animate-pulse" /> ONLINE
          </motion.div>
        </div>
      </motion.header>

      {/* CONTENT AREA */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-6 min-h-0 overflow-hidden">
        
        {/* SIDEBAR - STAGGERED CHILDREN ANIMATION */}
        <motion.aside 
          variants={staggerContainer}
          className="w-full lg:w-[350px] xl:w-[400px] flex flex-col gap-4 overflow-hidden shrink-0"
        >
          
          {/* 1. WEBCAM FEED CONTAINER */}
          <motion.div 
            variants={scaleIn}
            className="relative rounded-xl overflow-hidden bg-neutral-900 border border-white/10 shadow-lg aspect-video shrink-0 z-10"
          >
            <Webcam 
              ref={webcamRef} 
              className="absolute top-0 left-0 w-full h-full object-cover" 
              mirrored={true} 
            />
            <canvas 
              ref={canvasRef} 
              className="absolute top-0 left-0 w-full h-full object-cover scale-x-[-1]" 
            />
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="absolute top-2 left-2 flex items-center gap-2"
            >
              <span className={`w-2 h-2 rounded-full animate-ping ${handData.systemStatus === 'TRACKING ACTIVE' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
              <span className="text-[10px] text-white bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm border border-white/10 font-mono">CAM-01 FEED</span>
            </motion.div>
          </motion.div>

          {/* 2. SCROLLABLE STATS AREA */}
          <motion.div 
            variants={fadeInUp}
            className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-2"
          >
            
            <motion.div 
              variants={staggerContainer}
              className="bg-neutral-900/50 p-4 rounded-xl space-y-4 backdrop-blur-sm border border-white/5 flex flex-col min-h-min"
            >
              <motion.h3 variants={fadeInUp} className="text-white flex items-center gap-2 text-xs font-bold uppercase tracking-wider sticky top-0 bg-neutral-900/0 backdrop-blur-md py-2 z-10 -mt-2">
                <Activity size={14} className="text-amber-200" /> System Diagnostics
              </motion.h3>
              
              {/* Score Card - Interactive Hover */}
              <motion.div 
                variants={fadeInUp}
                whileHover={{ scale: 1.02, backgroundColor: "rgba(0,0,0,0.9)" }}
                className="bg-black/80 p-4 rounded-xl shadow-inner border border-white/5 flex items-center justify-between shrink-0 cursor-default"
              >
                <div>
                  <p className="text-[10px] text-neutral-400 uppercase font-mono">Correct Performance</p>
                  <motion.p 
                    key={score} // Key change triggers animation re-render
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
                  ACTUATOR: <br/> {handData.gesture}
                </motion.div>
                
                <motion.div variants={fadeInUp} className="p-2 rounded-xl bg-white/5 border border-white/5">
                  <p className="text-[9px] text-neutral-400 uppercase font-mono">Confidence</p>
                  <div className="flex items-baseline gap-1">
                    <motion.p 
                      animate={{ opacity: [0.8, 1, 0.8] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className={`text-sm font-bold ${handData.confidence > 80 ? 'text-emerald-400' : 'text-yellow-500'}`}
                    >
                      {handData.confidence}%
                    </motion.p>
                  </div>
                </motion.div>
                
                <motion.div variants={fadeInUp} className="p-2 rounded-xl bg-white/5 border border-white/5">
                  <p className="text-[9px] text-neutral-400 uppercase font-mono">Hand Detected</p>
                  <p className="text-sm font-bold text-white flex items-center gap-2"><ScanFace size={14} className="text-slate-400" /> {handData.handedness}</p>
                </motion.div>
                
                <motion.div 
                  variants={fadeInUp}
                  animate={{ borderColor: activeGrabId ? "rgba(251, 191, 36, 0.4)" : "rgba(255, 255, 255, 0.05)" }}
                  className="col-span-2 bg-white/5 p-2 rounded-xl border border-white/5 flex items-center justify-between"
                >
                  <div className="flex flex-col gap-y-1 p-1">
                    <p className="text-[9px] text-neutral-400 uppercase font-mono">Target Lock</p>
                    <div className='flex items-center gap-x-2'>
                      <Target size={14} className={activeGrabId ? "text-amber-200 animate-pulse" : "text-slate-600"} />
                      <p className={`text-xs font-bold truncate ${activeGrabId ? 'text-amber-200' : 'text-neutral-500'}`}>
                        {activeGrabId ? `OBJ-${activeGrabId} ENGAGED` : 'NO TARGET'}
                      </p>
                    </div>
                  </div>
                  {activeGrabId && (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                    >
                       <Lock size={14} className="text-white mr-2" />
                    </motion.div>
                  )}
                </motion.div>
              </div>

              {/* Log Area */}
              <motion.div variants={fadeInUp} className="mt-4">
                <p className="text-[9px] text-neutral-500 uppercase mb-1 font-mono">System Log</p>
                <div className="p-2 bg-black/80 border border-neutral-800 text-neutral-400 h-32 overflow-y-auto text-[10px] rounded-lg space-y-1 font-mono custom-scrollbar">
                  <p className="text-neutral-600">-- [SYSTEM INIT] Core modules loaded...</p>
                  <div className="border-t border-neutral-800 pt-1 mt-1">
                    {handData.landmarks.length > 0 ? (
                      <AnimatePresence mode="popLayout">
                        <motion.p 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="text-emerald-500"
                        >
                          {'>'} TRACKING ACTIVE
                        </motion.p>
                        {handData.gesture === 'GRIPPING' && (
                          <motion.p 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-rose-400 bg-rose-900/20 inline-block px-1 rounded mt-1"
                          >
                            {'>'} GRIP_EVENT_DETECTED
                          </motion.p>
                        )}
                      </AnimatePresence>
                    ) : (
                      <p className="text-amber-500/80 animate-pulse">{'>'} WAITING FOR OPERATOR...</p>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>

          </motion.div>
        </motion.aside>

        {/* MAIN CANVAS AREA - FADE IN TAPI DALAMNYA TETAP PURE REACT THREE FIBER */}
        <motion.section 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "circOut" }}
          className="flex-1 relative bg-linear-to-br from-neutral-900 to-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl group min-h-[300px]"
        >
          <div className="absolute inset-0">
            {/* CANVAS TIDAK DI-WRAPP DENGAN MOTION UNTUK MENGHINDARI KONFLIK LOOP RENDERING */}
            <Canvas camera={{ position: [0, 4, 16], fov: 40 }} shadows resize={{ scroll: false }}>
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} intensity={1.5} color="#06b6d4" />
              <pointLight position={[-10, -5, -10]} intensity={1} color="#ec4899" />
              <Environment preset="city" />
              <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />

              <SortingZone position={[-4.5, -2, 0]} color="#fee685"/>
              <SortingZone position={[4.5, -2, 0]} color="#ffffff"/>

              <Hand3D landmarks={handData.landmarks} />

              <SmartCube
                id={1} startPos={[-1, 0, 0]} color="#fee685" targetZoneX={-1}
                landmarks={handData.landmarks} isGripping={handData.gesture === 'GRIPPING'}
                activeId={activeGrabId}
                onGrab={() => setActiveGrabId(1)}
                onRelease={() => setActiveGrabId(null)}
                onScore={handleScore}
                onFail={handleFail}
              />

              <SmartCube
                id={2} startPos={[1, 0, 0]} color="#ffffff" targetZoneX={1}
                landmarks={handData.landmarks} isGripping={handData.gesture === 'GRIPPING'}
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
          </div>

          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="absolute bottom-4 right-4 text-[10px] text-slate-400 bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10 flex items-center shadow-lg"
          >
            <Box size={12} className="inline mr-2 text-cyan-400" /> 
            <span className="font-mono tracking-wide">MISSION: SORT COLORS TO ZONES</span>
          </motion.div>
        </motion.section>
      </div>
    </motion.div>
  );
};

export default HandRobotDashboard;