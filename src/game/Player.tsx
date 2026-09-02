import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Group, MathUtils, Mesh } from 'three';
import { world } from '../data';
import { useGameStore } from '../store/gameStore';
import { clampToBounds, slideMove, toBoxes } from './collision';
import {
  CAMERA_YAW,
  PLAYER_ACCEL,
  PLAYER_FRICTION,
  PLAYER_HEIGHT,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  TURN_DAMPING,
  ZONE_HYSTERESIS,
} from './constants';
import type { InputState } from './input/useInput';

/** Posição do personagem, lida pela câmera sem passar pelo estado do React. */
export type PlayerRef = { x: number; z: number };

const ACCENT = '#1AF1F2';

type Props = {
  input: React.RefObject<InputState>;
  position: React.RefObject<PlayerRef>;
};

/**
 * Personagem e toda a sua simulação.
 *
 * A geometria é procedural de propósito: um boneco simples de cápsula e esferas
 * mantém o estilo coeso com os prédios (também procedurais), não custa download
 * nenhum e evita depender de um modelo externo para o site funcionar.
 */
export function Player({ input, position }: Props) {
  const group = useRef<Group>(null);
  const bobbing = useRef<Mesh>(null);

  const boxes = useMemo(() => toBoxes(world.obstacles), []);
  const velocity = useRef({ x: 0, z: 0 });
  const walkPhase = useRef(0);

  const setActiveZone = useGameStore((state) => state.setActiveZone);

  useFrame((_, rawDelta) => {
    const node = group.current;
    if (!node) return;

    // Uma aba em segundo plano acumula delta gigante; limitar evita o personagem
    // atravessar paredes ao voltar o foco.
    const delta = Math.min(rawDelta, 1 / 20);
    const paused = useGameStore.getState().openDialog !== null;

    const desiredX = paused ? 0 : input.current.x;
    const desiredY = paused ? 0 : input.current.y;
    const moving = desiredX !== 0 || desiredY !== 0;

    if (moving) {
      // O input é relativo à tela; girar por CAMERA_YAW faz "para cima" na tela
      // virar "para longe da câmera" no mundo.
      const cos = Math.cos(CAMERA_YAW);
      const sin = Math.sin(CAMERA_YAW);
      const worldX = desiredX * cos - desiredY * sin;
      const worldZ = desiredX * sin + desiredY * cos;

      const blend = 1 - Math.exp(-PLAYER_ACCEL * delta);
      velocity.current.x += (worldX * PLAYER_SPEED - velocity.current.x) * blend;
      velocity.current.z += (worldZ * PLAYER_SPEED - velocity.current.z) * blend;
    } else {
      const decay = Math.exp(-PLAYER_FRICTION * delta);
      velocity.current.x *= decay;
      velocity.current.z *= decay;
    }

    const speed = Math.hypot(velocity.current.x, velocity.current.z);

    if (speed > 0.001) {
      const moved = slideMove(
        position.current,
        velocity.current.x * delta,
        velocity.current.z * delta,
        PLAYER_RADIUS,
        boxes,
      );
      const bounded = clampToBounds(moved, world.boundsRadius);
      position.current.x = bounded.x;
      position.current.z = bounded.z;

      node.position.x = bounded.x;
      node.position.z = bounded.z;

      const targetAngle = Math.atan2(velocity.current.x, velocity.current.z);
      node.rotation.y = MathUtils.damp(
        node.rotation.y,
        nearestAngle(node.rotation.y, targetAngle),
        TURN_DAMPING,
        delta,
      );
    }

    // Balanço vertical proporcional à velocidade: sugere passos sem esqueleto animado.
    walkPhase.current += speed * delta * 3.2;
    if (bobbing.current) {
      const amount = Math.min(speed / PLAYER_SPEED, 1);
      bobbing.current.position.y = Math.abs(Math.sin(walkPhase.current)) * 0.12 * amount;
      bobbing.current.rotation.z = Math.sin(walkPhase.current) * 0.06 * amount;
    }

    detectZone(position.current, setActiveZone);
  });

  return (
    <group ref={group} position={[world.spawn[0], 0, world.spawn[1]]}>
      <mesh ref={bobbing} castShadow={false} position={[0, PLAYER_HEIGHT, 0]}>
        <capsuleGeometry args={[0.32, 0.5, 4, 12]} />
        <meshStandardMaterial color="#f2f5f7" roughness={0.55} metalness={0.05} />
      </mesh>

      {/* Cabeça e visor: dão frente ao personagem, para a rotação ser legível. */}
      <mesh position={[0, PLAYER_HEIGHT + 0.62, 0]}>
        <sphereGeometry args={[0.28, 16, 12]} />
        <meshStandardMaterial color="#dfe6ea" roughness={0.5} />
      </mesh>
      <mesh position={[0, PLAYER_HEIGHT + 0.62, 0.24]}>
        <boxGeometry args={[0.3, 0.12, 0.08]} />
        <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={0.9} />
      </mesh>
    </group>
  );
}

/**
 * Evita o giro pelo caminho longo: se o alvo está a mais de meia volta, traz o
 * ângulo para o intervalo equivalente mais próximo do atual.
 */
function nearestAngle(current: number, target: number): number {
  const TAU = Math.PI * 2;
  let diff = (target - current) % TAU;
  if (diff > Math.PI) diff -= TAU;
  if (diff < -Math.PI) diff += TAU;
  return current + diff;
}

/**
 * Zona ativa por distância ao quadrado, com histerese: entra em `radius`, mas só
 * sai depois de `radius * ZONE_HYSTERESIS`, senão o prompt pisca na borda.
 */
function detectZone(point: PlayerRef, setActiveZone: (id: string | null) => void): void {
  const current = useGameStore.getState().activeZone;

  for (const zone of world.zones) {
    const dx = point.x - zone.position[0];
    const dz = point.z - zone.position[1];
    const distanceSq = dx * dx + dz * dz;

    const limit = zone.sectionId === current ? zone.radius * ZONE_HYSTERESIS : zone.radius;

    if (distanceSq < limit * limit) {
      setActiveZone(zone.sectionId);
      return;
    }
  }

  setActiveZone(null);
}
