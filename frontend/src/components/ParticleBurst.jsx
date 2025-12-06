import { Sphere } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from 'three';

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

export default ParticleBurst