import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { type Group, MathUtils } from 'three';
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

/** Posição do personagem, lida pela câmera sem passar pelo estado do React. */
export type PlayerRef = { x: number; z: number };

/**
 * Cores do cavalinho.
 *
 * Ele é uma piada visível: o personagem é um cavalo, referência direta ao
 * gohorse.dev — a metodologia eXtreme Go Horse. Um alazão baixinho e cabeçudo,
 * no mesmo registro arredondado do resto do mundo.
 */
const HORSE = {
  body: '#b5763f',
  bodyDark: '#9c6033',
  mane: '#5f3f22',
  hoof: '#33261a',
  muzzle: '#d0a878',
} as const;

type Props = {
  input: React.RefObject<InputState>;
  position: React.RefObject<PlayerRef>;
};

/**
 * O personagem e toda a sua simulação.
 *
 * A geometria é a de um cavalo, mas a física é a mesma de antes: quem controla —
 * teclado, joystick ou piloto automático — escreve no mesmo objeto de entrada, e
 * o movimento, a colisão e a detecção de zona não sabem que trocou o boneco.
 *
 * As quatro pernas são animadas em trote: os pares na diagonal (dianteira
 * esquerda com traseira direita, e vice-versa) se movem juntos. Isso cai
 * naturalmente da máquina de animação herdada, que já movia dois pares em
 * contrafase.
 */
export function Player({ input, position }: Props) {
  const group = useRef<Group>(null);
  const body = useRef<Group>(null);
  const head = useRef<Group>(null);
  // Nomes herdados da simulação; aqui cada um é uma perna do cavalo.
  const legLeft = useRef<Group>(null); // traseira esquerda
  const legRight = useRef<Group>(null); // traseira direita
  const armLeft = useRef<Group>(null); // dianteira esquerda
  const armRight = useRef<Group>(null); // dianteira direita

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
        {/* Pernas. Cada uma gira a partir do quadril (o topo do grupo), para o
            balanço parecer uma passada, e não um retângulo pivotando no meio. */}
        <Leg reference={armLeft} x={-0.17} z={0.26} />
        <Leg reference={armRight} x={0.17} z={0.26} />
        <Leg reference={legLeft} x={-0.17} z={-0.26} />
        <Leg reference={legRight} x={0.17} z={-0.26} />

        {/* Tronco: uma cápsula deitada ao longo do eixo de avanço (+Z é a frente). */}
        <mesh position={[0, 0.62, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <capsuleGeometry args={[0.28, 0.62, 6, 12]} />
          <meshLambertMaterial color={HORSE.body} flatShading />
        </mesh>

        {/* Garupa um pouco mais alta, para o corpo não ser um tubo reto. */}
        <mesh position={[0, 0.68, -0.32]}>
          <sphereGeometry args={[0.3, 14, 12]} />
          <meshLambertMaterial color={HORSE.body} flatShading />
        </mesh>

        {/* Rabo. */}
        <mesh position={[0, 0.62, -0.6]} rotation={[0.5, 0, 0]}>
          <coneGeometry args={[0.12, 0.5, 8]} />
          <meshLambertMaterial color={HORSE.mane} flatShading />
        </mesh>

        {/* Pescoço, subindo à frente. */}
        <mesh position={[0, 0.86, 0.32]} rotation={[-0.5, 0, 0]}>
          <cylinderGeometry args={[0.16, 0.22, 0.5, 10]} />
          <meshLambertMaterial color={HORSE.body} flatShading />
        </mesh>

        <group ref={head} position={[0, 1.12, 0.46]}>
          {/* Cabeça grande e chibi. */}
          <mesh castShadow>
            <boxGeometry args={[0.3, 0.34, 0.4]} />
            <meshLambertMaterial color={HORSE.body} flatShading />
          </mesh>
          {/* Focinho mais claro, apontando para a frente. */}
          <mesh position={[0, -0.06, 0.26]}>
            <boxGeometry args={[0.22, 0.2, 0.2]} />
            <meshLambertMaterial color={HORSE.muzzle} flatShading />
          </mesh>
          {/* Narinas. */}
          <mesh position={[-0.06, -0.08, 0.37]}>
            <sphereGeometry args={[0.025, 6, 6]} />
            <meshBasicMaterial color="#2b2b33" />
          </mesh>
          <mesh position={[0.06, -0.08, 0.37]}>
            <sphereGeometry args={[0.025, 6, 6]} />
            <meshBasicMaterial color="#2b2b33" />
          </mesh>

          {/* Olhos: dão a direção do personagem quando ele gira. */}
          <mesh position={[-0.13, 0.06, 0.16]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshBasicMaterial color="#2b2b33" />
          </mesh>
          <mesh position={[0.13, 0.06, 0.16]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshBasicMaterial color="#2b2b33" />
          </mesh>

          {/* Orelhas. */}
          <mesh position={[-0.1, 0.22, -0.02]} rotation={[0, 0, -0.2]}>
            <coneGeometry args={[0.06, 0.16, 6]} />
            <meshLambertMaterial color={HORSE.body} flatShading />
          </mesh>
          <mesh position={[0.1, 0.22, -0.02]} rotation={[0, 0, 0.2]}>
            <coneGeometry args={[0.06, 0.16, 6]} />
            <meshLambertMaterial color={HORSE.body} flatShading />
          </mesh>

          {/* Topete da crina, entre as orelhas. */}
          <mesh position={[0, 0.2, -0.12]} rotation={[0.4, 0, 0]}>
            <coneGeometry args={[0.1, 0.24, 6]} />
            <meshLambertMaterial color={HORSE.mane} flatShading />
          </mesh>
        </group>

        {/* Crina, descendo pela nuca. */}
        <mesh position={[0, 0.98, 0.18]} rotation={[-0.5, 0, 0]}>
          <boxGeometry args={[0.1, 0.44, 0.14]} />
          <meshLambertMaterial color={HORSE.mane} flatShading />
        </mesh>
      </group>

      {/* Sombra pintada, presa ao chão sob o cavalo. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} scale={[1, 1.35, 1]}>
        <circleGeometry args={[0.42, 20]} />
        <meshBasicMaterial color="#2f5d2a" transparent opacity={0.28} />
      </mesh>
    </group>
  );
}

/** Uma perna que pivota no quadril: o casco fica na ponta de baixo. */
function Leg({
  reference,
  x,
  z,
}: {
  reference: React.RefObject<Group | null>;
  x: number;
  z: number;
}) {
  return (
    <group ref={reference} position={[x, 0.46, z]}>
      <mesh position={[0, -0.2, 0]}>
        <boxGeometry args={[0.13, 0.42, 0.14]} />
        <meshLambertMaterial color={HORSE.bodyDark} flatShading />
      </mesh>
      <mesh position={[0, -0.42, 0.01]}>
        <boxGeometry args={[0.15, 0.08, 0.16]} />
        <meshLambertMaterial color={HORSE.hoof} />
      </mesh>
    </group>
  );
}

type Parts = {
  body: React.RefObject<Group | null>;
  head: React.RefObject<Group | null>;
  legLeft: React.RefObject<Group | null>;
  legRight: React.RefObject<Group | null>;
  armLeft: React.RefObject<Group | null>;
  armRight: React.RefObject<Group | null>;
};

/**
 * Trote e ociosidade.
 *
 * Andando: as quatro pernas em contrafase cruzada, formando os pares diagonais
 * do trote, com um pulinho do corpo a cada batida. Parado: só a respiração. A
 * troca é por interpolação da amplitude, então não há corte entre os estados.
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

  const swing = Math.sin(phase.current * 2) * 0.6 * intensity;

  // Pares diagonais: traseira-direita com dianteira-esquerda, e o oposto.
  if (parts.legRight.current) parts.legRight.current.rotation.x = -swing;
  if (parts.armLeft.current) parts.armLeft.current.rotation.x = -swing;
  if (parts.legLeft.current) parts.legLeft.current.rotation.x = swing;
  if (parts.armRight.current) parts.armRight.current.rotation.x = swing;

  if (parts.body.current) {
    // O pulo tem o dobro da frequência da passada: sobe a cada batida diagonal.
    const bounce = Math.abs(Math.sin(phase.current * 2)) * 0.06 * intensity;
    const breathing = Math.sin(elapsed * 2) * 0.012 * (1 - intensity);
    parts.body.current.position.y = bounce + breathing;
    parts.body.current.rotation.x = Math.sin(phase.current * 2) * 0.04 * intensity;
  }

  if (parts.head.current) {
    // A cabeça acena junto do galope, o que dá vida ao movimento.
    parts.head.current.rotation.x = Math.sin(phase.current * 2 - 0.4) * 0.05 * intensity;
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
