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
export default MechJoint