import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { type Group, MathUtils } from 'three';
import { sectionById, world } from '../../data';
import type { Zone } from '../../data/schema';
import { pick } from '../../i18n/locale';
import { useGameStore, useLocale } from '../../store/gameStore';
import { PALETTE } from '../palette';
import { Signpost } from './Signpost';

/**
 * As quatro construções da vila.
 *
 * Cada uma é um prédio reconhecível — casa, oficina, torre, quadro de avisos —
 * em vez de um bloco abstrato: a silhueta é o que faz o jogador entender o que
 * está vendo antes de ler qualquer texto. Todas usam cantos arredondados, que é
 * o detalhe que separa "caixa" de "brinquedo".
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
  const roof = PALETTE[zone.building.roofColor as keyof typeof PALETTE] ?? PALETTE.roofRed;

  useFrame((state, rawDelta) => {
    const node = group.current;
    if (!node) return;
    const delta = Math.min(rawDelta, 1 / 20);

    // Ao entrar na zona a construção dá um pulinho e volta a respirar devagar.
    // É o retorno que confirma "é aqui" sem precisar de texto.
    const target = isActive ? 1.06 : 1;
    const breathe = isActive ? Math.sin(state.clock.elapsedTime * 3) * 0.012 : 0;
    node.scale.setScalar(MathUtils.damp(node.scale.x, target + breathe, 9, delta));
  });

  return (
    <group position={[zone.position[0], 0, zone.position[1]]}>
      <group ref={group} rotation={[0, MathUtils.degToRad(zone.building.rotation), 0]}>
        <BuildingBody zone={zone} roof={roof} />
      </group>

      {/* Sombra pintada no chão, no lugar de um shadow map. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0.3]}>
        <circleGeometry args={[Math.max(...zone.building.footprint) * 0.62, 28]} />
        <meshBasicMaterial color="#2f5d2a" transparent opacity={0.22} />
      </mesh>

      {section ? (
        <Signpost
          position={[0, 0, zone.radius * 0.62]}
          label={pick(section.label, locale)}
          accent={roof}
          highlighted={isActive}
          visited={visited.has(zone.sectionId)}
          facing={zone.building.rotation}
        />
      ) : null}
    </group>
  );
}

function BuildingBody({ zone, roof }: { zone: Zone; roof: string }) {
  const { height, footprint } = zone.building;
  const [width, depth] = footprint;

  switch (zone.building.kind) {
    case 'house':
      return (
        <group>
          <Walls width={width} depth={depth} height={height} />
          <GableRoof width={width} depth={depth} y={height} color={roof} />
          <Door z={depth / 2} />
          <Window x={-width * 0.28} y={height * 0.62} z={depth / 2} />
          <Window x={width * 0.28} y={height * 0.62} z={depth / 2} />
          <Chimney x={width * 0.3} y={height + 0.7} z={-depth * 0.15} />
        </group>
      );

    case 'workshop':
      return (
        <group>
          <Walls width={width} depth={depth} height={height} />
          <GableRoof width={width} depth={depth} y={height} color={roof} />
          <Door z={depth / 2} wide />
          <Window x={-width * 0.32} y={height * 0.66} z={depth / 2} />
          <Window x={width * 0.32} y={height * 0.66} z={depth / 2} />

          {/* Toldo listrado sobre a porta: dá cara de oficina/loja. */}
          <mesh position={[0, height * 0.52, depth / 2 + 0.45]} rotation={[-0.42, 0, 0]}>
            <boxGeometry args={[width * 0.72, 0.09, 1.1]} />
            <meshLambertMaterial color={roof} />
          </mesh>

          <Chimney x={-width * 0.3} y={height + 0.8} z={-depth * 0.2} />
        </group>
      );

    case 'tower':
      return (
        <group>
          {/* Corpo cilíndrico de pedra, com uma cinta a meia altura. */}
          <mesh position={[0, height / 2, 0]} castShadow>
            <cylinderGeometry args={[width * 0.42, width * 0.48, height, 16]} />
            <meshLambertMaterial color={PALETTE.stone} />
          </mesh>
          <mesh position={[0, height * 0.52, 0]}>
            <cylinderGeometry args={[width * 0.45, width * 0.45, 0.3, 16]} />
            <meshLambertMaterial color={PALETTE.stoneDark} />
          </mesh>

          {/* Sacada e telhado cônico. */}
          <mesh position={[0, height + 0.12, 0]}>
            <cylinderGeometry args={[width * 0.56, width * 0.5, 0.28, 16]} />
            <meshLambertMaterial color={PALETTE.wood} />
          </mesh>
          <mesh position={[0, height + 1.15, 0]}>
            <coneGeometry args={[width * 0.62, 1.9, 16]} />
            <meshLambertMaterial color={roof} />
          </mesh>
          <mesh position={[0, height + 2.25, 0]}>
            <sphereGeometry args={[0.17, 12, 10]} />
            <meshLambertMaterial
              color={PALETTE.brand}
              emissive={PALETTE.brand}
              emissiveIntensity={0.5}
            />
          </mesh>

          <Door z={width * 0.42} />
          <Window x={0} y={height * 0.68} z={width * 0.42} round />
        </group>
      );

    case 'signboard':
      return (
        <group>
          {/* Dois postes e uma prancha: o quadro de avisos da vila. */}
          <mesh position={[-width * 0.36, height * 0.42, 0]}>
            <cylinderGeometry args={[0.11, 0.13, height * 0.85, 8]} />
            <meshLambertMaterial color={PALETTE.woodDark} />
          </mesh>
          <mesh position={[width * 0.36, height * 0.42, 0]}>
            <cylinderGeometry args={[0.11, 0.13, height * 0.85, 8]} />
            <meshLambertMaterial color={PALETTE.woodDark} />
          </mesh>

          <RoundedBox
            args={[width, height * 0.56, 0.22]}
            radius={0.08}
            smoothness={3}
            position={[0, height * 0.78, 0]}
            castShadow
          >
            <meshLambertMaterial color={PALETTE.wood} />
          </RoundedBox>

          <mesh position={[0, height * 0.78, 0.13]}>
            <planeGeometry args={[width * 0.86, height * 0.42]} />
            <meshLambertMaterial color={PALETTE.wallShade} />
          </mesh>

          {/* Telhadinho, para parecer cuidado e não abandonado. */}
          <mesh position={[0, height * 1.1, 0]} rotation={[0, Math.PI / 4, 0]}>
            <cylinderGeometry args={[width * 0.5, width * 0.5, 0.4, 4, 1]} />
            <meshLambertMaterial color={roof} />
          </mesh>
        </group>
      );
  }
}

/** Paredes com cantos arredondados e um rodapé de pedra. */
function Walls({ width, depth, height }: { width: number; depth: number; height: number }) {
  return (
    <group>
      <RoundedBox
        args={[width, height, depth]}
        radius={0.16}
        smoothness={3}
        position={[0, height / 2, 0]}
        castShadow
      >
        <meshLambertMaterial color={PALETTE.wall} />
      </RoundedBox>

      <RoundedBox
        args={[width * 1.02, 0.5, depth * 1.02]}
        radius={0.1}
        smoothness={3}
        position={[0, 0.25, 0]}
      >
        <meshLambertMaterial color={PALETTE.stone} />
      </RoundedBox>
    </group>
  );
}

/** Telhado de duas águas: um prisma triangular deitado sobre as paredes. */
function GableRoof({
  width,
  depth,
  y,
  color,
}: {
  width: number;
  depth: number;
  y: number;
  color: string;
}) {
  return (
    <group position={[0, y, 0]}>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[0, 0.72, 0]} castShadow>
        <cylinderGeometry args={[depth * 0.78, depth * 0.78, width * 1.16, 3, 1]} />
        <meshLambertMaterial color={color} flatShading />
      </mesh>

      {/* Beiral: a sombra que ele projeta é o que dá peso ao telhado. */}
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[width * 1.2, 0.14, depth * 1.2]} />
        <meshLambertMaterial color={PALETTE.woodDark} />
      </mesh>
    </group>
  );
}

function Door({ z, wide = false }: { z: number; wide?: boolean }) {
  const width = wide ? 1.35 : 0.95;

  return (
    <group position={[0, 0, z + 0.02]}>
      <mesh position={[0, 0.82, 0]}>
        <planeGeometry args={[width, 1.62]} />
        <meshLambertMaterial color={PALETTE.woodDark} />
      </mesh>
      <mesh position={[0, 0.82, 0.02]}>
        <planeGeometry args={[width * 0.82, 1.44]} />
        <meshLambertMaterial color={PALETTE.wood} />
      </mesh>
      <mesh position={[width * 0.26, 0.82, 0.04]}>
        <sphereGeometry args={[0.06, 8, 6]} />
        <meshLambertMaterial color={PALETTE.brand} />
      </mesh>
    </group>
  );
}

function Window({ x, y, z, round = false }: { x: number; y: number; z: number; round?: boolean }) {
  return (
    <group position={[x, y, z + 0.03]}>
      <mesh>
        {round ? <circleGeometry args={[0.34, 16]} /> : <planeGeometry args={[0.72, 0.66]} />}
        <meshLambertMaterial color={PALETTE.woodDark} />
      </mesh>
      <mesh position={[0, 0, 0.02]}>
        {round ? <circleGeometry args={[0.26, 16]} /> : <planeGeometry args={[0.56, 0.5]} />}
        {/* Vidro levemente emissivo: as janelas acesas dão vida à vila. */}
        <meshLambertMaterial color="#ffe9a8" emissive="#ffcf5c" emissiveIntensity={0.35} />
      </mesh>
    </group>
  );
}

function Chimney({ x, y, z }: { x: number; y: number; z: number }) {
  return (
    <group position={[x, y, z]}>
      <RoundedBox args={[0.5, 1.1, 0.5]} radius={0.06} smoothness={2}>
        <meshLambertMaterial color={PALETTE.stone} />
      </RoundedBox>
      <mesh position={[0, 0.62, 0]}>
        <boxGeometry args={[0.62, 0.16, 0.62]} />
        <meshLambertMaterial color={PALETTE.stoneDark} />
      </mesh>
    </group>
  );
}
