import { useFrame } from "@react-three/fiber";
import { Text } from '@react-three/drei';
import { useCallback, useRef, useState } from "react";
import * as THREE from 'three';

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

export default SmartCube