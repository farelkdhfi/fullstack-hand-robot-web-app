import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Text } from '@react-three/drei';

import * as THREE from 'three';

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
export default SortingZone