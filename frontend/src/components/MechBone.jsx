import * as THREE from 'three';

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

export default MechBone