import { useEffect, useState } from 'react';
import { CanvasTexture, LinearFilter, type Texture } from 'three';
import { world } from '../../data';
import icon from '../../assets/profile-secondary.jpg';

/**
 * O logotipo do perfil gravado no chão da ilha.
 *
 * A ideia é a de um emblema desenhado na grama de um campo esportivo: presente,
 * mas leve, parte do cenário. Num print do jogo ele aparece no chão como uma
 * assinatura, sem competir com a vila.
 *
 * O ícone do perfil é uma silhueta preta sobre fundo amarelo. Aqui ela é
 * reprocessada no navegador: a figura vira um verde mais escuro que o gramado —
 * como grama aparada num tom diferente — e o fundo some por completo. Uma
 * máscara circular apaga as bordas, para o emblema se dissolver no gramado em
 * vez de terminar num recorte duro.
 */

/** Lado da textura gerada. O ícone de origem é 512×512. */
const SIZE = 512;

/** Verde escuro da figura, no tom de "grama aparada mais rente". */
const FIGURE = [24, 40, 18] as const;

/** Abaixo deste brilho, o pixel é figura; acima, é fundo. */
const FIGURE_THRESHOLD = 110;

/** Onde a máscara circular começa e termina de apagar (0 = centro, 1 = borda). */
const FADE_START = 0.9;
const FADE_END = 1;

/**
 * Rotação do emblema no plano do chão, em radianos.
 *
 * Alinha o topo da silhueta ao "para longe da câmera", para que, vista no
 * ângulo isométrico, ela apareça de pé em vez de deitada. É um valor de ajuste
 * fino: se o rosto ficar de lado, é só girar por múltiplos de meia volta.
 */
const EMBLEM_ROTATION = Math.PI / 4;

/** Intensidade final. Bem baixa de propósito — o emblema é um sussurro. */
const EMBLEM_OPACITY = 0.5;

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function useEmblemTexture(): Texture | null {
  const [texture, setTexture] = useState<Texture | null>(null);

  useEffect(() => {
    let cancelled = false;
    const image = new Image();
    image.src = icon;

    image.onload = () => {
      if (cancelled) return;

      const canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      const context = canvas.getContext('2d');
      if (!context) return;

      context.drawImage(image, 0, 0, SIZE, SIZE);

      // O ícone é um asset do próprio site, então a leitura de pixels é
      // permitida — não há canvas "contaminado" por origem cruzada.
      const buffer = context.getImageData(0, 0, SIZE, SIZE);
      const pixels = buffer.data;
      const center = SIZE / 2;

      for (let y = 0; y < SIZE; y += 1) {
        for (let x = 0; x < SIZE; x += 1) {
          const index = (y * SIZE + x) * 4;

          const luma =
            0.299 * pixels[index]! + 0.587 * pixels[index + 1]! + 0.114 * pixels[index + 2]!;
          const isFigure = luma < FIGURE_THRESHOLD;

          const dx = (x - center) / center;
          const dy = (y - center) / center;
          const radial = Math.hypot(dx, dy);
          const mask = 1 - smoothstep(FADE_START, FADE_END, radial);

          pixels[index] = FIGURE[0];
          pixels[index + 1] = FIGURE[1];
          pixels[index + 2] = FIGURE[2];
          pixels[index + 3] = isFigure ? Math.round(255 * mask) : 0;
        }
      }

      context.putImageData(buffer, 0, 0);

      const canvasTexture = new CanvasTexture(canvas);
      canvasTexture.minFilter = LinearFilter;
      canvasTexture.magFilter = LinearFilter;
      canvasTexture.needsUpdate = true;

      setTexture(canvasTexture);
    };

    return () => {
      cancelled = true;
    };
  }, []);

  return texture;
}

export function WorldEmblem() {
  const texture = useEmblemTexture();
  if (!texture) return null;

  const radius = world.island.grassRadius * 1.0;

  return (
    <mesh rotation={[-Math.PI / 2, 0, EMBLEM_ROTATION]} position={[0, 0.02, 0]} renderOrder={1}>
      <circleGeometry args={[radius, 64]} />
      {/*
       * depthWrite desligado para não interferir na profundidade de nada que
       * passe por cima. O polygonOffset é o que mata a cintilação: várias
       * sombras pintadas (árvores, prédios) ficam exatamente nesta mesma altura,
       * e duas superfícies coplanares disputam a profundidade pixel a pixel,
       * piscando quando a câmera se mexe. O offset dá ao emblema uma vantagem
       * fixa nessa disputa, sem tirá-lo de trás do cavalo nem dos prédios.
       */}
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={EMBLEM_OPACITY}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-2}
        polygonOffsetUnits={-2}
      />
    </mesh>
  );
}
