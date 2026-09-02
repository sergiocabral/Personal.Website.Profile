import { useMemo } from 'react';
import { world } from '../data';

/**
 * Chão do mapa.
 *
 * É um disco, não um quadrado: os limites de movimento são circulares
 * (`boundsRadius`), então um chão quadrado deixaria o jogador batendo numa
 * parede invisível com terreno visível à frente.
 */
export function Ground() {
  const radius = world.boundsRadius + 1.5;

  // Sombras "assadas": um quad escuro sob cada prédio. Sai bem mais barato que
  // um shadow map, e com geometria chapada fica até mais limpo.
  const shadows = useMemo(
    () =>
      world.zones.map((zone) => ({
        id: zone.sectionId,
        position: zone.position,
        size: zone.building.footprint,
        rotation: (zone.building.rotation * Math.PI) / 180,
      })),
    [],
  );

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[radius, 64]} />
        <meshLambertMaterial color={world.ground.color} />
      </mesh>

      {/* Praça central, marcando o ponto de partida. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[6.5, 48]} />
        <meshLambertMaterial color={world.ground.pathColor} />
      </mesh>

      {/* Anel de borda: dá acabamento e comunica onde o mapa termina. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <ringGeometry args={[world.boundsRadius - 0.15, world.boundsRadius, 96]} />
        <meshBasicMaterial color="#2f3a4c" transparent opacity={0.65} />
      </mesh>

      {shadows.map((shadow) => (
        <mesh
          key={shadow.id}
          rotation={[-Math.PI / 2, 0, -shadow.rotation]}
          position={[shadow.position[0], 0.012, shadow.position[1]]}
        >
          <planeGeometry args={[shadow.size[0] * 1.12, shadow.size[1] * 1.12]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.22} />
        </mesh>
      ))}
    </group>
  );
}
