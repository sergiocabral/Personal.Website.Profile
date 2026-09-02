import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Group, MathUtils } from 'three';

/**
 * Placa flutuante com o nome da seção.
 *
 * Contra-rotaciona a rotação do prédio para o texto ficar sempre de frente para
 * a câmera isométrica, que é fixa — não precisa de billboard de verdade.
 */
export function Billboard({
  position,
  text,
  accent,
  highlighted,
  done,
  rotation,
}: {
  position: [number, number, number];
  text: string;
  accent: string;
  highlighted: boolean;
  done: boolean;
  rotation: number;
}) {
  const group = useRef<Group>(null);
  const base = position[1];

  useFrame((state, rawDelta) => {
    const node = group.current;
    if (!node) return;
    const delta = Math.min(rawDelta, 1 / 20);

    // Flutuação lenta, o suficiente para o olho notar que é interativo.
    node.position.y = base + Math.sin(state.clock.elapsedTime * 1.3) * 0.08;

    const target = highlighted ? 1.14 : 1;
    node.scale.setScalar(MathUtils.damp(node.scale.x, target, 9, delta));
  });

  return (
    <group ref={group} position={position} rotation={[0, rotation + Math.PI / 4, 0]}>
      <Text
        fontSize={0.52}
        color={highlighted ? '#ffffff' : '#dbe3ea'}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.045}
        outlineColor="#0d1117"
        maxWidth={7}
      >
        {text}
      </Text>

      {/* Ponto de status: aceso quando a seção já foi lida nesta visita. */}
      <mesh position={[0, -0.55, 0]}>
        <circleGeometry args={[0.11, 16]} />
        <meshBasicMaterial color={done ? accent : '#4a5568'} />
      </mesh>
    </group>
  );
}
