import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { type Group, MathUtils } from 'three';
import { CAMERA_DIRECTION } from '../constants';
import { PALETTE } from '../palette';
import { useTextTexture } from './useTextTexture';

/** Ângulo que deixa a placa de frente para a câmera, que é fixa. */
const CAMERA_ANGLE = Math.atan2(CAMERA_DIRECTION[0], CAMERA_DIRECTION[2]);

/**
 * Placa de madeira fincada na frente de cada construção.
 *
 * Faz o que a placa sempre fez num RPG: dizer o que é aquele lugar antes de o
 * jogador chegar. O texto é uma textura desenhada no próprio navegador, e não
 * um componente de texto 3D — ver `useTextTexture` para o porquê.
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

  const { texture, aspect } = useTextTexture(label, {
    width: 240,
    fontSize: 16,
    color: PALETTE.woodDark,
    outline: PALETTE.wall,
  });

  const boardWidth = 2.6;
  const boardHeight = boardWidth / aspect;

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 20);

    if (board.current) {
      // Balanço leve, como placa pendurada. Para quando o jogador chega, para o
      // texto ficar parado na hora de ler.
      const sway = highlighted ? 0 : Math.sin(state.clock.elapsedTime * 1.4) * 0.05;
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
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 1.1, 8]} />
        <meshLambertMaterial color={PALETTE.woodDark} />
      </mesh>

      <group ref={board} position={[0, 1.45, 0]}>
        {/* Prancha de madeira, um pouco maior que o texto. */}
        <mesh castShadow>
          <boxGeometry args={[boardWidth + 0.22, boardHeight + 0.22, 0.14]} />
          <meshLambertMaterial color={PALETTE.wood} />
        </mesh>
        <mesh position={[0, 0, 0.08]}>
          <boxGeometry args={[boardWidth + 0.06, boardHeight + 0.06, 0.02]} />
          <meshLambertMaterial color={highlighted ? PALETTE.wallShade : PALETTE.wall} />
        </mesh>

        {texture ? (
          <mesh position={[0, 0, 0.1]}>
            <planeGeometry args={[boardWidth, boardHeight]} />
            <meshBasicMaterial map={texture} transparent />
          </mesh>
        ) : null}

        {/* Selo aceso quando a seção já foi lida — o "visitado" da vila. */}
        <mesh position={[boardWidth / 2 + 0.02, boardHeight / 2 + 0.02, 0.1]}>
          <circleGeometry args={[0.12, 14]} />
          <meshBasicMaterial color={visited ? accent : PALETTE.woodDark} />
        </mesh>
      </group>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <circleGeometry args={[0.3, 16]} />
        <meshBasicMaterial color="#2f5d2a" transparent opacity={0.25} />
      </mesh>
    </group>
  );
}
