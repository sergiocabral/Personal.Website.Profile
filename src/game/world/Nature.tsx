import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { type Group, MathUtils } from 'three';
import { world } from '../../data';
import type { Prop, PropKind } from '../../data/schema';
import { PALETTE } from '../palette';

/**
 * Vegetação e mobiliário da vila.
 *
 * As copas das árvores e os arbustos são aglomerados de esferas, não cones: é a
 * silhueta arredondada que dá o aspecto de maquete. Cones deixariam tudo com
 * cara de pinheiro genérico de cenário 3D.
 */
export function Nature() {
  const grouped = useMemo(() => {
    const map = new Map<PropKind, Prop[]>();
    for (const prop of world.props) {
      const list = map.get(prop.kind) ?? [];
      list.push(prop);
      map.set(prop.kind, list);
    }
    return map;
  }, []);

  return (
    <group>
      {[...grouped.entries()].flatMap(([kind, props]) =>
        props.map((prop, index) => (
          <group
            key={`${kind}-${index}`}
            position={[prop.position[0], 0, prop.position[1]]}
            rotation={[0, MathUtils.degToRad(prop.rotation ?? 0), 0]}
            scale={prop.scale ?? 1}
          >
            <PropBody kind={kind} seed={index} />
          </group>
        )),
      )}
    </group>
  );
}

function PropBody({ kind, seed }: { kind: PropKind; seed: number }) {
  switch (kind) {
    case 'tree':
      return <Tree seed={seed} />;
    case 'bush':
      return <Bush />;
    case 'flower':
      return <Flower seed={seed} />;
    case 'rock':
      return <Rock />;
    case 'lamp':
      return <Lamp />;
    case 'bench':
      return <Bench />;
    case 'fountain':
      return <Fountain />;
  }
}

/** Sombra circular pintada no chão, usada por tudo que fica em pé. */
function GroundShadow({ radius }: { radius: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
      <circleGeometry args={[radius, 18]} />
      <meshBasicMaterial color="#2f5d2a" transparent opacity={0.24} />
    </mesh>
  );
}

function Tree({ seed }: { seed: number }) {
  const group = useRef<Group>(null);
  // Fases diferentes por árvore: se todas balançassem juntas, pareceria um
  // efeito aplicado por cima em vez de vento.
  const phase = (seed % 7) * 0.9;

  useFrame((state) => {
    if (!group.current) return;
    const time = state.clock.elapsedTime;
    group.current.rotation.z = Math.sin(time * 0.9 + phase) * 0.035;
    group.current.rotation.x = Math.cos(time * 0.7 + phase) * 0.022;
  });

  return (
    <group>
      <mesh position={[0, 0.75, 0]} castShadow>
        <cylinderGeometry args={[0.19, 0.28, 1.5, 7]} />
        <meshLambertMaterial color={PALETTE.trunk} flatShading />
      </mesh>

      <group ref={group}>
        <mesh position={[0, 2.05, 0]} castShadow>
          <sphereGeometry args={[1.05, 12, 10]} />
          <meshLambertMaterial color={PALETTE.leaf} flatShading />
        </mesh>
        <mesh position={[0.55, 1.72, 0.3]}>
          <sphereGeometry args={[0.72, 10, 8]} />
          <meshLambertMaterial color={PALETTE.leafDark} flatShading />
        </mesh>
        <mesh position={[-0.5, 1.8, -0.3]}>
          <sphereGeometry args={[0.66, 10, 8]} />
          <meshLambertMaterial color={PALETTE.leafDark} flatShading />
        </mesh>
        {/* Toque de luz no topo, do lado que recebe o sol. */}
        <mesh position={[-0.24, 2.62, 0.24]}>
          <sphereGeometry args={[0.6, 10, 8]} />
          <meshLambertMaterial color={PALETTE.leafLight} flatShading />
        </mesh>
      </group>

      <GroundShadow radius={1.15} />
    </group>
  );
}

function Bush() {
  return (
    <group>
      <mesh position={[0, 0.42, 0]} castShadow>
        <sphereGeometry args={[0.52, 10, 8]} />
        <meshLambertMaterial color={PALETTE.leaf} flatShading />
      </mesh>
      <mesh position={[0.36, 0.3, 0.12]}>
        <sphereGeometry args={[0.36, 8, 7]} />
        <meshLambertMaterial color={PALETTE.leafDark} flatShading />
      </mesh>
      <mesh position={[-0.3, 0.28, -0.16]}>
        <sphereGeometry args={[0.32, 8, 7]} />
        <meshLambertMaterial color={PALETTE.leafLight} flatShading />
      </mesh>
      <GroundShadow radius={0.6} />
    </group>
  );
}

function Flower({ seed }: { seed: number }) {
  const colors = [PALETTE.flowerRed, PALETTE.flowerYellow, PALETTE.flowerWhite];
  const color = colors[seed % colors.length]!;

  return (
    <group>
      <mesh position={[0, 0.17, 0]}>
        <cylinderGeometry args={[0.025, 0.035, 0.34, 5]} />
        <meshLambertMaterial color={PALETTE.leafDark} />
      </mesh>
      {/* Quatro pétalas em cruz e um miolo: legível mesmo do tamanho que tem. */}
      {[0, 1, 2, 3].map((index) => {
        const angle = (index * Math.PI) / 2;
        return (
          <mesh key={index} position={[Math.cos(angle) * 0.11, 0.36, Math.sin(angle) * 0.11]}>
            <sphereGeometry args={[0.085, 7, 6]} />
            <meshLambertMaterial color={color} />
          </mesh>
        );
      })}
      <mesh position={[0, 0.38, 0]}>
        <sphereGeometry args={[0.07, 7, 6]} />
        <meshLambertMaterial color={PALETTE.brand} />
      </mesh>
    </group>
  );
}

function Rock() {
  return (
    <group>
      <mesh position={[0, 0.3, 0]} castShadow>
        <dodecahedronGeometry args={[0.52, 0]} />
        <meshLambertMaterial color={PALETTE.stone} flatShading />
      </mesh>
      <mesh position={[0.38, 0.14, 0.2]}>
        <dodecahedronGeometry args={[0.24, 0]} />
        <meshLambertMaterial color={PALETTE.stoneDark} flatShading />
      </mesh>
      <GroundShadow radius={0.62} />
    </group>
  );
}

function Lamp() {
  const light = useRef<Group>(null);

  useFrame((state) => {
    if (!light.current) return;
    // Oscilação mínima, como uma chama presa dentro do vidro.
    const flicker = 1 + Math.sin(state.clock.elapsedTime * 6.5) * 0.04;
    light.current.scale.setScalar(flicker);
  });

  return (
    <group>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.22, 0.26, 0.24, 8]} />
        <meshLambertMaterial color={PALETTE.stoneDark} />
      </mesh>
      <mesh position={[0, 1.15, 0]}>
        <cylinderGeometry args={[0.07, 0.09, 2, 8]} />
        <meshLambertMaterial color={PALETTE.woodDark} />
      </mesh>

      <group ref={light} position={[0, 2.32, 0]}>
        <mesh>
          <boxGeometry args={[0.34, 0.42, 0.34]} />
          <meshLambertMaterial
            color={PALETTE.brand}
            emissive={PALETTE.brand}
            emissiveIntensity={0.85}
          />
        </mesh>
        <mesh position={[0, 0.3, 0]}>
          <coneGeometry args={[0.28, 0.24, 4]} />
          <meshLambertMaterial color={PALETTE.woodDark} />
        </mesh>
      </group>

      <GroundShadow radius={0.34} />
    </group>
  );
}

function Bench() {
  return (
    <group>
      <mesh position={[0, 0.46, 0]} castShadow>
        <boxGeometry args={[1.6, 0.12, 0.5]} />
        <meshLambertMaterial color={PALETTE.wood} />
      </mesh>
      <mesh position={[0, 0.78, -0.22]} rotation={[-0.22, 0, 0]}>
        <boxGeometry args={[1.6, 0.44, 0.1]} />
        <meshLambertMaterial color={PALETTE.wood} />
      </mesh>
      {[-0.62, 0.62].map((x) => (
        <mesh key={x} position={[x, 0.23, 0]}>
          <boxGeometry args={[0.13, 0.46, 0.46]} />
          <meshLambertMaterial color={PALETTE.woodDark} />
        </mesh>
      ))}
      <GroundShadow radius={0.85} />
    </group>
  );
}

function Fountain() {
  const water = useRef<Group>(null);

  useFrame((state) => {
    if (!water.current) return;
    const time = state.clock.elapsedTime;
    water.current.position.y = 1.52 + Math.sin(time * 2.2) * 0.06;
    water.current.rotation.y = time * 0.5;
  });

  return (
    <group>
      {/* Bacia de pedra, borda e lâmina d'água. */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[1.75, 1.9, 0.6, 20]} />
        <meshLambertMaterial color={PALETTE.stone} flatShading />
      </mesh>
      <mesh position={[0, 0.62, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.75, 0.14, 8, 24]} />
        <meshLambertMaterial color={PALETTE.stoneDark} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.58, 0]}>
        <circleGeometry args={[1.68, 24]} />
        <meshLambertMaterial
          color={PALETTE.water}
          emissive={PALETTE.water}
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Coluna central e o jato. */}
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.26, 0.42, 1.1, 12]} />
        <meshLambertMaterial color={PALETTE.stone} flatShading />
      </mesh>
      <mesh position={[0, 1.6, 0]}>
        <cylinderGeometry args={[0.62, 0.3, 0.26, 14]} />
        <meshLambertMaterial color={PALETTE.stoneDark} />
      </mesh>

      <group ref={water}>
        <mesh>
          <sphereGeometry args={[0.3, 12, 10]} />
          <meshLambertMaterial
            color={PALETTE.waterFoam}
            emissive={PALETTE.water}
            emissiveIntensity={0.35}
            transparent
            opacity={0.9}
          />
        </mesh>
        {[0, 1, 2, 3, 4].map((index) => {
          const angle = (index / 5) * Math.PI * 2;
          return (
            <mesh key={index} position={[Math.cos(angle) * 0.42, -0.22, Math.sin(angle) * 0.42]}>
              <sphereGeometry args={[0.12, 8, 6]} />
              <meshLambertMaterial color={PALETTE.waterFoam} transparent opacity={0.75} />
            </mesh>
          );
        })}
      </group>

      <GroundShadow radius={2} />
    </group>
  );
}
