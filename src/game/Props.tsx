import { useMemo } from 'react';
import { MathUtils } from 'three';
import { world } from '../data';
import type { Prop } from '../data/schema';

/**
 * Decoração do mapa: árvores, arbustos, postes, bancos e a fonte da praça.
 *
 * Tudo estático e sem interação. As posições vêm de `world.json` para o mapa ser
 * editável sem tocar em código.
 */
export function Props() {
  const grouped = useMemo(() => {
    const map = new Map<Prop['kind'], Prop[]>();
    for (const prop of world.props) {
      const list = map.get(prop.kind) ?? [];
      list.push(prop);
      map.set(prop.kind, list);
    }
    return map;
  }, []);

  return (
    <group>
      {[...grouped.entries()].map(([kind, props]) =>
        props.map((prop, index) => (
          <group
            key={`${kind}-${index}`}
            position={[prop.position[0], 0, prop.position[1]]}
            rotation={[0, MathUtils.degToRad(prop.rotation ?? 0), 0]}
            scale={prop.scale ?? 1}
          >
            <PropBody kind={kind} />
          </group>
        )),
      )}
    </group>
  );
}

function PropBody({ kind }: { kind: Prop['kind'] }) {
  switch (kind) {
    case 'tree':
      return (
        <group>
          <mesh position={[0, 0.55, 0]}>
            <cylinderGeometry args={[0.13, 0.18, 1.1, 6]} />
            <meshStandardMaterial color="#5d4632" roughness={0.95} flatShading />
          </mesh>
          {/* Duas copas cônicas desencontradas dão volume sem muitos triângulos. */}
          <mesh position={[0, 1.55, 0]}>
            <coneGeometry args={[0.85, 1.5, 7]} />
            <meshStandardMaterial color="#2f6b46" roughness={0.9} flatShading />
          </mesh>
          <mesh position={[0, 2.25, 0]} rotation={[0, 0.5, 0]}>
            <coneGeometry args={[0.6, 1.1, 7]} />
            <meshStandardMaterial color="#38805a" roughness={0.9} flatShading />
          </mesh>
        </group>
      );

    case 'bush':
      return (
        <mesh position={[0, 0.35, 0]}>
          <dodecahedronGeometry args={[0.48, 0]} />
          <meshStandardMaterial color="#34724e" roughness={0.95} flatShading />
        </mesh>
      );

    case 'lamp':
      return (
        <group>
          <mesh position={[0, 1.15, 0]}>
            <cylinderGeometry args={[0.06, 0.08, 2.3, 6]} />
            <meshStandardMaterial color="#79839a" roughness={0.5} metalness={0.4} />
          </mesh>
          <mesh position={[0, 2.42, 0]}>
            <sphereGeometry args={[0.22, 12, 10]} />
            <meshStandardMaterial
              color="#FFD602"
              emissive="#FFD602"
              emissiveIntensity={1.6}
              toneMapped={false}
            />
          </mesh>
        </group>
      );

    case 'bench':
      return (
        <group>
          <mesh position={[0, 0.42, 0]}>
            <boxGeometry args={[1.5, 0.11, 0.45]} />
            <meshStandardMaterial color="#8a6a49" roughness={0.9} flatShading />
          </mesh>
          <mesh position={[0, 0.72, -0.2]} rotation={[-0.25, 0, 0]}>
            <boxGeometry args={[1.5, 0.42, 0.09]} />
            <meshStandardMaterial color="#8a6a49" roughness={0.9} flatShading />
          </mesh>
          <mesh position={[-0.6, 0.21, 0]}>
            <boxGeometry args={[0.11, 0.42, 0.42]} />
            <meshStandardMaterial color="#5c5f68" roughness={0.7} />
          </mesh>
          <mesh position={[0.6, 0.21, 0]}>
            <boxGeometry args={[0.11, 0.42, 0.42]} />
            <meshStandardMaterial color="#5c5f68" roughness={0.7} />
          </mesh>
        </group>
      );

    case 'fountain':
      return (
        <group>
          <mesh position={[0, 0.22, 0]}>
            <cylinderGeometry args={[1.3, 1.4, 0.44, 20]} />
            <meshStandardMaterial color="#4a5568" roughness={0.85} flatShading />
          </mesh>
          {/* Disco de água ligeiramente acima da borda, com brilho próprio. */}
          <mesh position={[0, 0.45, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[1.16, 24]} />
            <meshStandardMaterial
              color="#1AF1F2"
              emissive="#1AF1F2"
              emissiveIntensity={0.35}
              roughness={0.15}
              metalness={0.1}
            />
          </mesh>
          <mesh position={[0, 0.85, 0]}>
            <cylinderGeometry args={[0.16, 0.26, 0.9, 10]} />
            <meshStandardMaterial color="#5b6a78" roughness={0.8} />
          </mesh>
          <mesh position={[0, 1.42, 0]}>
            <sphereGeometry args={[0.24, 14, 10]} />
            <meshStandardMaterial
              color="#1AF1F2"
              emissive="#1AF1F2"
              emissiveIntensity={0.9}
              toneMapped={false}
            />
          </mesh>
        </group>
      );
  }
}
