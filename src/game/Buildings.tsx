import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Group, MathUtils } from 'three';
import { sectionById, world } from '../data';
import type { Zone } from '../data/schema';
import { pick } from '../i18n/locale';
import { useGameStore, useLocale } from '../store/gameStore';
import { Billboard } from './Billboard';

/**
 * Uma construção por zona, montada com primitivas.
 *
 * Geometria procedural em vez de modelos baixados: o estilo fica coeso de graça,
 * o bundle não cresce e mudar o mapa é editar `world.json`, não abrir o Blender.
 */
export function Buildings() {
  return (
    <group>
      {world.zones.map((zone) => (
        <Building key={zone.sectionId} zone={zone} />
      ))}
    </group>
  );
}

function Building({ zone }: { zone: Zone }) {
  const group = useRef<Group>(null);
  const locale = useLocale();
  const activeZone = useGameStore((state) => state.activeZone);
  const visited = useGameStore((state) => state.visited);

  const section = sectionById.get(zone.sectionId);
  const isActive = activeZone === zone.sectionId;
  const { building } = zone;
  const [width, depth] = building.footprint;

  // Um leve "respiro" ao entrar na zona confirma para o jogador que ele chegou.
  useFrame((_, rawDelta) => {
    const node = group.current;
    if (!node) return;
    const delta = Math.min(rawDelta, 1 / 20);
    const target = isActive ? 1.05 : 1;
    const next = MathUtils.damp(node.scale.x, target, 8, delta);
    node.scale.setScalar(next);
  });

  return (
    <group
      ref={group}
      position={[zone.position[0], 0, zone.position[1]]}
      rotation={[0, MathUtils.degToRad(building.rotation), 0]}
    >
      <BuildingBody zone={zone} />

      {/* Marca circular no chão: mostra onde o gatilho começa, sem precisar de tutorial. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[zone.radius - 0.12, zone.radius, 48]} />
        <meshBasicMaterial
          color={isActive ? '#1AF1F2' : building.roofColor}
          transparent
          opacity={isActive ? 0.75 : 0.28}
        />
      </mesh>

      {section ? (
        <Billboard
          position={[0, building.height + 1.15, 0]}
          text={pick(section.label, locale)}
          accent={building.roofColor}
          highlighted={isActive}
          done={visited.has(zone.sectionId)}
          rotation={-MathUtils.degToRad(building.rotation)}
        />
      ) : null}

      {/* Colisor invisível não é necessário: os obstáculos vêm de world.json. */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <planeGeometry args={[width, depth]} />
      </mesh>
    </group>
  );
}

function BuildingBody({ zone }: { zone: Zone }) {
  const { building } = zone;
  const [width, depth] = building.footprint;
  const { height, color, roofColor } = building;

  switch (building.kind) {
    case 'tower':
      return (
        <group>
          {/* Três blocos empilhados e recuados: silhueta de prédio sem custo extra. */}
          <Block size={[width, height * 0.55, depth]} y={height * 0.275} color={color} />
          <Block
            size={[width * 0.78, height * 0.3, depth * 0.78]}
            y={height * 0.55 + height * 0.15}
            color={color}
          />
          <Block
            size={[width * 0.5, height * 0.15, depth * 0.5]}
            y={height * 0.85 + height * 0.075}
            color={roofColor}
          />
          <Windows width={width} depth={depth} height={height * 0.55} rows={3} />
        </group>
      );

    case 'hall':
      return (
        <group>
          <Block size={[width, height, depth]} y={height / 2} color={color} />
          {/* Telhado de duas águas: um cilindro de 3 lados girado vira prisma. */}
          <mesh position={[0, height + 0.45, 0]} rotation={[0, Math.PI / 4, 0]}>
            <cylinderGeometry args={[width * 0.62, width * 0.62, depth * 1.02, 4, 1]} />
            <meshStandardMaterial color={roofColor} roughness={0.7} flatShading />
          </mesh>
          <Block
            size={[width * 0.28, height * 0.62, 0.16]}
            y={height * 0.31}
            z={depth / 2}
            color="#11161f"
          />
          <Windows width={width} depth={depth} height={height} rows={1} />
        </group>
      );

    case 'antenna':
      return (
        <group>
          <Block size={[width, height * 0.35, depth]} y={height * 0.175} color={color} />
          <mesh position={[0, height * 0.62, 0]}>
            <cylinderGeometry args={[0.12, 0.22, height * 0.55, 8]} />
            <meshStandardMaterial color="#8d99ae" roughness={0.4} metalness={0.5} />
          </mesh>
          {/* Prato da antena, inclinado para o céu. */}
          <mesh position={[0, height * 0.92, 0]} rotation={[-Math.PI / 3.2, 0, 0]}>
            <sphereGeometry args={[0.95, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2.4]} />
            <meshStandardMaterial color={roofColor} side={2} roughness={0.35} />
          </mesh>
          <mesh position={[0, height * 1.02, 0]}>
            <sphereGeometry args={[0.14, 10, 8]} />
            <meshStandardMaterial color={roofColor} emissive={roofColor} emissiveIntensity={1.4} />
          </mesh>
        </group>
      );

    case 'board':
      return (
        <group>
          <mesh position={[-width * 0.32, height * 0.35, 0]}>
            <cylinderGeometry args={[0.09, 0.09, height * 0.7, 8]} />
            <meshStandardMaterial color="#6b5540" roughness={0.9} />
          </mesh>
          <mesh position={[width * 0.32, height * 0.35, 0]}>
            <cylinderGeometry args={[0.09, 0.09, height * 0.7, 8]} />
            <meshStandardMaterial color="#6b5540" roughness={0.9} />
          </mesh>
          <Block size={[width, height * 0.5, 0.14]} y={height * 0.72} color={color} />
          <Block
            size={[width * 0.94, height * 0.42, 0.06]}
            y={height * 0.72}
            z={0.09}
            color={roofColor}
          />
        </group>
      );
  }
}

function Block({
  size,
  y,
  z = 0,
  color,
}: {
  size: [number, number, number];
  y: number;
  z?: number;
  color: string;
}) {
  return (
    <mesh position={[0, y, z]}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.78} flatShading />
    </mesh>
  );
}

/** Fileiras de janelas acesas nas quatro faces, para o prédio não ficar liso. */
function Windows({
  width,
  depth,
  height,
  rows,
}: {
  width: number;
  depth: number;
  height: number;
  rows: number;
}) {
  const items: React.ReactElement[] = [];
  const columns = 2;

  for (let row = 0; row < rows; row++) {
    const y = height * ((row + 0.85) / (rows + 0.7));

    for (let column = 0; column < columns; column++) {
      const offset = (column - (columns - 1) / 2) * (width * 0.42);
      const lit = (row + column) % 3 !== 0;
      const color = lit ? '#FFD602' : '#20293a';

      items.push(
        <mesh key={`f${row}${column}`} position={[offset, y, depth / 2 + 0.01]}>
          <planeGeometry args={[0.42, 0.5]} />
          <meshBasicMaterial color={color} />
        </mesh>,
        <mesh
          key={`b${row}${column}`}
          position={[offset, y, -depth / 2 - 0.01]}
          rotation={[0, Math.PI, 0]}
        >
          <planeGeometry args={[0.42, 0.5]} />
          <meshBasicMaterial color={color} />
        </mesh>,
      );
    }
  }

  return <group>{items}</group>;
}
