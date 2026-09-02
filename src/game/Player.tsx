import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { type Group, MathUtils, type Mesh } from 'three';
import { world } from '../data';
import { useGameStore } from '../store/gameStore';
import { clampToBounds, slideMove, toBoxes } from './collision';
import {
  PLAYER_ACCEL,
  PLAYER_FRICTION,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  SCREEN_FORWARD,
  SCREEN_RIGHT,
  TURN_DAMPING,
  ZONE_HYSTERESIS,
} from './constants';
import type { InputState } from './input/useInput';
import { PALETTE } from './palette';

/** Posição do personagem, lida pela câmera sem passar pelo estado do React. */
export type PlayerRef = { x: number; z: number };

type Props = {
  input: React.RefObject<InputState>;
  position: React.RefObject<PlayerRef>;
};

/**
 * O personagem e toda a sua simulação.
 *
 * As proporções são chibi — cabeça quase do tamanho do tronco — que é o que faz
 * um boneco simples parecer um personagem em vez de um manequim. Braços e
 * pernas são animados por seno em contrafase, o suficiente para ler como
 * caminhada sem esqueleto nem modelo baixado.
 */
export function Player({ input, position }: Props) {
  const group = useRef<Group>(null);
  const body = useRef<Group>(null);
  const legLeft = useRef<Mesh>(null);
  const legRight = useRef<Mesh>(null);
  const armLeft = useRef<Mesh>(null);
  const armRight = useRef<Mesh>(null);
  const head = useRef<Group>(null);

  const boxes = useMemo(() => toBoxes(world.obstacles), []);
  const velocity = useRef({ x: 0, z: 0 });
  const walkPhase = useRef(0);

  const setActiveZone = useGameStore((state) => state.setActiveZone);

  useFrame((state, rawDelta) => {
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
      // O input chega em eixos de tela (x para a direita, y para baixo) e é
      // convertido para o mundo pela base derivada da câmera. O y é invertido
      // porque "para cima na tela" é o sentido positivo de SCREEN_FORWARD.
      const worldX = SCREEN_RIGHT[0] * desiredX - SCREEN_FORWARD[0] * desiredY;
      const worldZ = SCREEN_RIGHT[1] * desiredX - SCREEN_FORWARD[1] * desiredY;

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

    animate(
      { body, head, legLeft, legRight, armLeft, armRight },
      speed,
      walkPhase,
      delta,
      state.clock.elapsedTime,
    );

    detectZone(position.current, setActiveZone);
  });

  return (
    <group ref={group} position={[world.spawn[0], 0, world.spawn[1]]}>
      <group ref={body}>
        {/* Pernas curtas e grossas, para acompanhar a cabeça grande. */}
        <mesh ref={legLeft} position={[-0.16, 0.22, 0]}>
          <capsuleGeometry args={[0.11, 0.2, 4, 8]} />
          <meshLambertMaterial color={PALETTE.boot} />
        </mesh>
        <mesh ref={legRight} position={[0.16, 0.22, 0]}>
          <capsuleGeometry args={[0.11, 0.2, 4, 8]} />
          <meshLambertMaterial color={PALETTE.boot} />
        </mesh>

        {/* Túnica: tronco de cone, mais largo embaixo. */}
        <mesh position={[0, 0.62, 0]} castShadow>
          <cylinderGeometry args={[0.26, 0.4, 0.62, 12]} />
          <meshLambertMaterial color={PALETTE.tunic} flatShading />
        </mesh>
        <mesh position={[0, 0.34, 0]}>
          <cylinderGeometry args={[0.41, 0.42, 0.1, 12]} />
          <meshLambertMaterial color={PALETTE.tunicDark} />
        </mesh>

        <mesh ref={armLeft} position={[-0.34, 0.74, 0]}>
          <capsuleGeometry args={[0.085, 0.24, 4, 8]} />
          <meshLambertMaterial color={PALETTE.tunicDark} />
        </mesh>
        <mesh ref={armRight} position={[0.34, 0.74, 0]}>
          <capsuleGeometry args={[0.085, 0.24, 4, 8]} />
          <meshLambertMaterial color={PALETTE.tunicDark} />
        </mesh>

        <group ref={head} position={[0, 1.18, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.34, 16, 14]} />
            <meshLambertMaterial color={PALETTE.skin} />
          </mesh>

          {/* Cabelo como calota, deixando o rosto livre. */}
          <mesh position={[0, 0.06, -0.04]}>
            <sphereGeometry args={[0.345, 16, 14, 0, Math.PI * 2, 0, Math.PI / 1.9]} />
            <meshLambertMaterial color={PALETTE.hair} />
          </mesh>

          {/* Olhos: é o que dá direção ao personagem quando ele gira. */}
          <mesh position={[-0.12, -0.02, 0.3]}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshBasicMaterial color="#2b2b33" />
          </mesh>
          <mesh position={[0.12, -0.02, 0.3]}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshBasicMaterial color="#2b2b33" />
          </mesh>

          {/* Gorro pontudo, na linha do herói de RPG. */}
          <mesh position={[0, 0.32, -0.08]} rotation={[-0.38, 0, 0]}>
            <coneGeometry args={[0.3, 0.66, 12]} />
            <meshLambertMaterial color={PALETTE.tunic} flatShading />
          </mesh>
          <mesh position={[0, 0.14, 0]}>
            <cylinderGeometry args={[0.35, 0.35, 0.09, 14]} />
            <meshLambertMaterial color={PALETTE.tunicDark} />
          </mesh>
        </group>
      </group>

      {/* Sombra pintada, presa aos pés. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <circleGeometry args={[0.42, 18]} />
        <meshBasicMaterial color="#2f5d2a" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

type Parts = {
  body: React.RefObject<Group | null>;
  head: React.RefObject<Group | null>;
  legLeft: React.RefObject<Mesh | null>;
  legRight: React.RefObject<Mesh | null>;
  armLeft: React.RefObject<Mesh | null>;
  armRight: React.RefObject<Mesh | null>;
};

/**
 * Caminhada e ociosidade.
 *
 * Andando: pernas e braços em contrafase, com um salto do corpo a cada passo.
 * Parado: só a respiração. A troca é por interpolação da amplitude, então não
 * existe um corte entre os dois estados.
 */
function animate(
  parts: Parts,
  speed: number,
  phase: React.RefObject<number>,
  delta: number,
  elapsed: number,
) {
  const intensity = Math.min(speed / PLAYER_SPEED, 1);
  phase.current += speed * delta * 2.6;

  const swing = Math.sin(phase.current * 2) * 0.55 * intensity;

  if (parts.legLeft.current) parts.legLeft.current.rotation.x = swing;
  if (parts.legRight.current) parts.legRight.current.rotation.x = -swing;
  if (parts.armLeft.current) parts.armLeft.current.rotation.x = -swing * 0.8;
  if (parts.armRight.current) parts.armRight.current.rotation.x = swing * 0.8;

  if (parts.body.current) {
    // O salto tem o dobro da frequência do passo: sobe a cada pé que toca o chão.
    const bounce = Math.abs(Math.sin(phase.current * 2)) * 0.07 * intensity;
    const breathing = Math.sin(elapsed * 2) * 0.012 * (1 - intensity);
    parts.body.current.position.y = bounce + breathing;
    parts.body.current.rotation.z = Math.sin(phase.current * 2) * 0.05 * intensity;
  }

  if (parts.head.current) {
    // A cabeça atrasa um pouco em relação ao corpo, o que dá peso ao movimento.
    parts.head.current.rotation.z = -Math.sin(phase.current * 2 - 0.4) * 0.06 * intensity;
  }
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
