import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { MathUtils, type PerspectiveCamera, Vector3 } from 'three';
import {
  CAMERA_DAMPING,
  CAMERA_DIRECTION,
  CAMERA_FOV,
  CAMERA_MIN_DISTANCE,
  CAMERA_VIEW_SIZE,
} from './constants';
import type { PlayerRef } from './Player';

const DIRECTION = new Vector3(...CAMERA_DIRECTION).normalize();

/**
 * Câmera de diorama: ângulo fixo em três quartos, lente longa, alvo amortecido.
 *
 * Só o alvo é suavizado — a posição é derivada dele somando um deslocamento
 * constante. Amortecer posição e ponto de mira separadamente faria o
 * deslocamento variar de um quadro para o outro, a rotação derivaria e as
 * verticais dos prédios apareceriam tortas.
 */
export function DioramaCamera({ target }: { target: React.RefObject<PlayerRef> }) {
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  const size = useThree((state) => state.size);

  const look = useRef(new Vector3(target.current.x, 0, target.current.z));
  const offset = useRef(new Vector3());

  useEffect(() => {
    camera.fov = CAMERA_FOV;
    camera.near = 1;
    camera.far = 400;

    // Distância que enquadra CAMERA_VIEW_SIZE unidades na menor dimensão da
    // tela. No celular em retrato o gargalo é a largura; no monitor, a altura.
    // Sem isso, um mesmo afastamento mostraria um terço do mapa no celular.
    const aspect = size.width / size.height;
    const vertical = 2 * Math.tan(MathUtils.degToRad(CAMERA_FOV) / 2);
    const horizontal = vertical * aspect;
    const distance = Math.max(
      CAMERA_VIEW_SIZE / Math.min(vertical, horizontal),
      CAMERA_MIN_DISTANCE,
    );

    offset.current.copy(DIRECTION).multiplyScalar(distance);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 20);

    look.current.x = MathUtils.damp(look.current.x, target.current.x, CAMERA_DAMPING, delta);
    look.current.z = MathUtils.damp(look.current.z, target.current.z, CAMERA_DAMPING, delta);

    camera.position.copy(look.current).add(offset.current);
    camera.lookAt(look.current);
  });

  return null;
}
