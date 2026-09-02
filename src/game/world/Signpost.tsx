import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { type Group, MathUtils } from 'three';
import { PALETTE } from '../palette';
import { CAMERA_DIRECTION } from '../constants';

/** Ângulo que deixa a placa de frente para a câmera, que é fixa. */
const CAMERA_ANGLE = Math.atan2(CAMERA_DIRECTION[0], CAMERA_DIRECTION[2]);

/**
 * Placa de madeira fincada na frente de cada construção.
 *
 * Faz o trabalho que num RPG a placa sempre fez: dizer o que é aquele lugar
 * antes de o jogador entrar. O texto usa a fonte pixelada da interface, que é o
 * que amarra o mundo 3D à estética retrô sem pixelar a cena inteira.
 */
export function Signpost({
  position,
  label,
  accent,
  highlighted,
  visited,
  facing,
}: {
  position: [number, number, number];
  label: string;
  accent: string;
  highlighted: boolean;
  visited: boolean;
  facing: number;
}) {
  const group = useRef<Group>(null);
  const board = useRef<Group>(null);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 20);

    if (board.current) {
      // Balanço leve, como uma placa pendurada. Some quando o jogador chega,
      // para o texto ficar parado na hora de ler.
      const sway = highlighted ? 0 : Math.sin(state.clock.elapsedTime * 1.4) * 0.045;
      board.current.rotation.z = MathUtils.damp(board.current.rotation.z, sway, 6, delta);
    }

    if (group.current) {
      const target = highlighted ? 1.12 : 1;
      group.current.scale.setScalar(MathUtils.damp(group.current.scale.x, target, 8, delta));
    }
  });

  return (
    <group
      ref={group}
      position={position}
      // Anula a rotação da construção e alinha à câmera: o texto nunca fica de lado.
      rotation={[0, CAMERA_ANGLE - MathUtils.degToRad(facing), 0]}
    >
      {/* Poste. */}
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.075, 0.09, 1.1, 8]} />
        <meshLambertMaterial color={PALETTE.woodDark} />
      </mesh>

      <group ref={board} position={[0, 1.42, 0]}>
        <mesh castShadow>
          <boxGeometry args={[2.7, 0.82, 0.14]} />
          <meshLambertMaterial color={PALETTE.wood} />
        </mesh>
        <mesh position={[0, 0, 0.08]}>
          <boxGeometry args={[2.5, 0.64, 0.02]} />
          <meshLambertMaterial color={highlighted ? PALETTE.wallShade : PALETTE.wall} />
        </mesh>

        <Text
          position={[0, 0, 0.11]}
          fontSize={0.26}
          maxWidth={2.3}
          textAlign="center"
          anchorX="center"
          anchorY="middle"
          color={PALETTE.woodDark}
          font="https://fonts.gstatic.com/s/pressstart2p/v15/e3t4euO8T-267oIAQAu6jDQyK3nVivM.woff"
        >
          {label}
        </Text>

        {/* Selo aceso quando a seção já foi lida — o "check" da vila. */}
        <mesh position={[1.18, 0.32, 0.1]}>
          <circleGeometry args={[0.13, 14]} />
          <meshBasicMaterial color={visited ? accent : PALETTE.woodDark} />
        </mesh>
      </group>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <circleGeometry args={[0.32, 16]} />
        <meshBasicMaterial color="#2f5d2a" transparent opacity={0.25} />
      </mesh>
    </group>
  );
}
