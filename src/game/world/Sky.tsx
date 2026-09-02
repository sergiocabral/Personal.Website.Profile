import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { BackSide, type Group, MeshBasicMaterial } from 'three';
import { CAMERA_DIRECTION, SCREEN_RIGHT } from '../constants';
import { PALETTE } from '../palette';

/**
 * Céu e nuvens.
 *
 * As nuvens são aglomerados de esferas achatadas, não sprites. O componente de
 * nuvem pronto do drei baixa uma textura de um CDN de terceiros — a mesma
 * classe de dependência que já derrubou esta cena uma vez, quando a fonte das
 * placas passou a responder 404. Nada aqui dentro pode depender da rede.
 *
 * Elas vivem apenas no lado do céu oposto à câmera, e sempre acima da ilha.
 * Numa primeira versão flutuavam livremente e acabavam passando entre a câmera
 * e o mundo, tapando o jogo. Aqui isso é impossível por construção: a
 * disposição e a deriva são restritas ao semiespaço que a linha de visão nunca
 * atravessa.
 */

/** Direção da câmera projetada no chão, normalizada. */
const CAMERA_GROUND = normalize2(CAMERA_DIRECTION[0], CAMERA_DIRECTION[2]);

/** O oposto: para onde as nuvens vão, ou seja, atrás da ilha. */
const BEHIND = [-CAMERA_GROUND[0], -CAMERA_GROUND[1]] as const;

/** Distância mínima em que uma nuvem pode ficar do centro da ilha. */
const MIN_DISTANCE = 62;

/** Altura mínima. Abaixo disso a nuvem entraria no enquadramento da vila. */
const MIN_HEIGHT = 34;

export function Sky() {
  // A cúpula não recebe luz: é o fundo, e sombreá-la só a sujaria.
  const domeMaterial = useMemo(
    () => new MeshBasicMaterial({ color: PALETTE.sky, side: BackSide, fog: false }),
    [],
  );

  const clouds = useMemo(
    () =>
      // Espalhadas ao longo da faixa do horizonte que fica atrás da ilha.
      [
        { offset: -46, distance: 88, height: 44, scale: 1.6, speed: 0.5, seed: 0 },
        { offset: -14, distance: 74, height: 38, scale: 1.2, speed: 0.38, seed: 1 },
        { offset: 16, distance: 96, height: 50, scale: 1.8, speed: 0.44, seed: 2 },
        { offset: 44, distance: 78, height: 40, scale: 1.3, speed: 0.32, seed: 3 },
        { offset: 68, distance: 104, height: 56, scale: 1.5, speed: 0.28, seed: 4 },
      ].map((cloud) => ({
        ...cloud,
        distance: Math.max(cloud.distance, MIN_DISTANCE),
        height: Math.max(cloud.height, MIN_HEIGHT),
      })),
    [],
  );

  return (
    <group>
      <mesh material={domeMaterial}>
        <sphereGeometry args={[180, 24, 16]} />
      </mesh>

      {clouds.map((cloud) => (
        <Cloud key={cloud.seed} {...cloud} />
      ))}
    </group>
  );
}

/**
 * Uma nuvem: cinco bolhas achatadas deslizando de lado.
 *
 * A deriva acontece ao longo do eixo horizontal da tela, e não em X do mundo:
 * assim a nuvem cruza o quadro sem nunca variar a distância até a câmera.
 */
function Cloud({
  offset,
  distance,
  height,
  scale,
  speed,
  seed,
}: {
  offset: number;
  distance: number;
  height: number;
  scale: number;
  speed: number;
  seed: number;
}) {
  const group = useRef<Group>(null);

  const puffs = useMemo(() => {
    // Disposição fixa por semente: nuvens diferentes entre si, iguais a cada visita.
    const random = seeded(seed * 977 + 13);
    return Array.from({ length: 5 }, (_, index) => ({
      position: [
        (index - 2) * 2.1 + (random() - 0.5) * 1.2,
        (random() - 0.5) * 1.1,
        (random() - 0.5) * 1.8,
      ] as [number, number, number],
      radius: 1.5 + random() * 1.3,
    }));
  }, [seed]);

  const span = 150;

  useFrame((state) => {
    if (!group.current) return;

    // Percorre a faixa e reaparece do outro lado.
    const travelled = (((offset + state.clock.elapsedTime * speed) % span) + span) % span;
    const lateral = travelled - span / 2;

    group.current.position.set(
      BEHIND[0] * distance + SCREEN_RIGHT[0] * lateral,
      height,
      BEHIND[1] * distance + SCREEN_RIGHT[1] * lateral,
    );
  });

  return (
    <group ref={group} scale={scale}>
      {puffs.map((puff, index) => (
        <mesh key={index} position={puff.position} scale={[1, 0.62, 1]}>
          <sphereGeometry args={[puff.radius, 10, 8]} />
          <meshLambertMaterial
            color="#ffffff"
            emissive={PALETTE.skyHorizon}
            emissiveIntensity={0.35}
            transparent
            opacity={0.9}
            fog={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function normalize2(x: number, z: number): readonly [number, number] {
  const length = Math.hypot(x, z);
  return [x / length, z / length];
}

function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}
