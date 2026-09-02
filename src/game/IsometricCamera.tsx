import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { MathUtils, OrthographicCamera as ThreeOrthographicCamera, Vector3 } from 'three';
import { CAMERA_DAMPING, CAMERA_DIRECTION, CAMERA_DISTANCE, CAMERA_VIEW_SIZE } from './constants';
import type { PlayerRef } from './Player';

const OFFSET = new Vector3(...CAMERA_DIRECTION).normalize().multiplyScalar(CAMERA_DISTANCE);

/**
 * Câmera isométrica: projeção ortográfica, ângulo fixo, seguindo o personagem.
 *
 * Ortográfica e não perspectiva porque é o que dá a leitura de mapa — sem
 * distorção, um prédio distante tem o mesmo tamanho de um próximo, e o jogador
 * julga distâncias corretamente.
 */
export function IsometricCamera({ target }: { target: React.RefObject<PlayerRef> }) {
  const camera = useThree((state) => state.camera) as ThreeOrthographicCamera;
  const size = useThree((state) => state.size);
  const look = useRef(new Vector3(target.current.x, 0, target.current.z));

  // O zoom sai da menor dimensão da tela: no celular em retrato o gargalo é a
  // largura, no desktop é a altura. Assim o mapa cabe nos dois sem ajuste manual.
  useEffect(() => {
    const smallest = Math.min(size.width, size.height);
    camera.zoom = smallest / CAMERA_VIEW_SIZE;
    camera.left = -size.width / 2;
    camera.right = size.width / 2;
    camera.top = size.height / 2;
    camera.bottom = -size.height / 2;
    camera.near = -200;
    camera.far = 400;
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 20);

    look.current.x = MathUtils.damp(look.current.x, target.current.x, CAMERA_DAMPING, delta);
    look.current.z = MathUtils.damp(look.current.z, target.current.z, CAMERA_DAMPING, delta);

    camera.position.set(look.current.x + OFFSET.x, OFFSET.y, look.current.z + OFFSET.z);
    camera.lookAt(look.current);
  });

  return null;
}
