import * as THREE from 'three';

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

export default Crane3D