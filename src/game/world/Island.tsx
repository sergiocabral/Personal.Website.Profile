import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { DoubleSide, type Mesh, type MeshLambertMaterial } from 'three';
import { world } from '../../data';
import { PALETTE } from '../palette';

/**
 * O terreno: água, praia, grama, praça e os caminhos.
 *
 * Os caminhos são o que transforma quatro construções soltas numa vila — eles
 * dizem para onde ir antes de o jogador precisar procurar, e amarram o mapa
 * visualmente. Cada um é gerado do centro até uma zona, então nunca apontam
 * para o lugar errado quando o layout muda.
 */
export function Island() {
  const { island } = world;

  return (
    <group>
      <Water />

      {/* Praia. Fica logo abaixo da grama e aparece só na borda. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]} receiveShadow>
        <circleGeometry args={[island.sandRadius, 72]} />
        <meshLambertMaterial color={PALETTE.sand} />
      </mesh>

      {/* Faixa mais escura na linha d'água, para a praia não parecer recortada. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <ringGeometry args={[island.sandRadius - 0.9, island.sandRadius, 72]} />
        <meshLambertMaterial color={PALETTE.sandDark} />
      </mesh>

      <Grass />
      <Paths />
      <Plaza />
    </group>
  );
}

/** Água com ondulação suave e uma faixa de espuma na beira da ilha. */
function Water() {
  const material = useRef<MeshLambertMaterial>(null);
  const foam = useRef<Mesh>(null);

  useFrame((state) => {
    const time = state.clock.elapsedTime;

    // A espuma respira em vez de correr: num diorama parado, movimento demais
    // chama atenção para o lugar errado.
    if (foam.current) {
      const scale = 1 + Math.sin(time * 0.8) * 0.004;
      foam.current.scale.set(scale, scale, 1);
    }
    if (material.current) {
      material.current.opacity = 0.92 + Math.sin(time * 0.6) * 0.04;
    }
  });

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <circleGeometry args={[world.island.waterRadius, 64]} />
        <meshLambertMaterial ref={material} color={PALETTE.water} transparent opacity={0.95} />
      </mesh>

      <mesh ref={foam} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.44, 0]}>
        <ringGeometry args={[world.island.sandRadius, world.island.sandRadius + 1.6, 72]} />
        <meshLambertMaterial color={PALETTE.waterFoam} transparent opacity={0.75} />
      </mesh>

      {/* Parede lateral da ilha: sem ela o terreno parece um adesivo sobre a água. */}
      <mesh position={[0, -0.3, 0]}>
        <cylinderGeometry
          args={[world.island.sandRadius, world.island.sandRadius - 0.7, 0.7, 72, 1, true]}
        />
        <meshLambertMaterial color={PALETTE.sandDark} side={DoubleSide} />
      </mesh>
    </group>
  );
}

/** Gramado com manchas mais claras, para o verde não ficar chapado. */
function Grass() {
  const patches = useMemo(() => {
    const items: { position: [number, number]; radius: number }[] = [];
    let seed = 7;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    for (let i = 0; i < 14; i += 1) {
      const angle = random() * Math.PI * 2;
      const distance = 6 + random() * (world.island.grassRadius - 8);
      items.push({
        position: [Math.cos(angle) * distance, Math.sin(angle) * distance],
        radius: 1.6 + random() * 2.4,
      });
    }
    return items;
  }, []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <circleGeometry args={[world.island.grassRadius, 72]} />
        <meshLambertMaterial color={PALETTE.grass} />
      </mesh>

      {patches.map((patch, index) => (
        <mesh
          key={index}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[patch.position[0], -0.01, patch.position[1]]}
        >
          <circleGeometry args={[patch.radius, 20]} />
          <meshLambertMaterial color={PALETTE.grassLight} transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

/** Uma trilha de terra do centro até cada construção. */
function Paths() {
  const paths = useMemo(
    () =>
      world.zones.map((zone) => {
        const [x, z] = zone.position;
        const length = Math.hypot(x, z);
        return {
          id: zone.sectionId,
          // O caminho começa na borda da praça e termina na frente da construção.
          center: [x / 2, z / 2] as [number, number],
          length: length - world.island.plazaRadius * 0.4,
          angle: Math.atan2(x, z),
        };
      }),
    [],
  );

  return (
    <group>
      {paths.map((path) => (
        <group key={path.id}>
          <mesh
            rotation={[-Math.PI / 2, 0, -path.angle]}
            position={[path.center[0], 0.005, path.center[1]]}
          >
            <planeGeometry args={[2.5, path.length]} />
            <meshLambertMaterial color={PALETTE.path} />
          </mesh>
          {/* Bordas mais escuras dão a impressão de terra batida e afundada. */}
          <mesh
            rotation={[-Math.PI / 2, 0, -path.angle]}
            position={[path.center[0], 0.004, path.center[1]]}
          >
            <planeGeometry args={[3.1, path.length]} />
            <meshLambertMaterial color={PALETTE.pathDark} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Praça central calçada, com um anel de pedra na borda. */
function Plaza() {
  const { plazaRadius } = world.island;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} receiveShadow>
        <circleGeometry args={[plazaRadius, 48]} />
        <meshLambertMaterial color={PALETTE.path} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.014, 0]}>
        <ringGeometry args={[plazaRadius - 0.55, plazaRadius, 48]} />
        <meshLambertMaterial color={PALETTE.stone} />
      </mesh>

      {/* Mosaico interno: um anel mais claro que centraliza o olhar na fonte. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.016, 0]}>
        <ringGeometry args={[2.2, 2.7, 40]} />
        <meshLambertMaterial color={PALETTE.stoneDark} />
      </mesh>
    </group>
  );
}
