import { useMemo, useRef } from "react";
import MechBone from "./MechBone";
import MechJoint from "./MechJoint";
import * as THREE from 'three';

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
export default Hand3D