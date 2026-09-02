import { useEffect, useMemo, useState } from 'react';
import { CanvasTexture, LinearFilter, NearestFilter, SRGBColorSpace, type Texture } from 'three';

/**
 * Desenha um texto numa textura, com Canvas 2D.
 *
 * Substitui o `<Text>` do drei, que baixa um arquivo de fonte em tempo de
 * execução. Aqui isso não é aceitável: a fonte ficava atrás de uma URL que
 * podia sumir — e sumiu, com um 404 que suspendia a cena inteira e deixava a
 * tela vazia. Uma placa de madeira não pode depender da rede para existir.
 *
 * De quebra, dispensa a biblioteca de texto 3D (que é a maior dependência do
 * drei) e usa a mesma fonte pixelada que a interface já carregou.
 */

const FONT_FAMILY = "'Press Start 2P', 'Courier New', monospace";

/** Escala de desenho: a textura é maior que o mostrado, para não borrar de perto. */
const RESOLUTION = 4;

export function useTextTexture(
  text: string,
  options: {
    /** Largura da placa em pixels lógicos. O texto quebra dentro dela. */
    width?: number;
    fontSize?: number;
    color?: string;
    /** Contorno claro atrás das letras, para o texto sobreviver a qualquer fundo. */
    outline?: string;
  } = {},
): { texture: Texture | null; aspect: number } {
  const { width = 220, fontSize = 15, color = '#4a3524', outline } = options;

  // A fonte chega depois do primeiro quadro. Sem esperar, a placa seria
  // desenhada com a fonte de recuo e ficaria assim para sempre.
  const [fontReady, setFontReady] = useState(
    () => typeof document === 'undefined' || !document.fonts || document.fonts.status === 'loaded',
  );

  useEffect(() => {
    if (fontReady) return;

    let active = true;
    document.fonts.ready.then(() => {
      if (active) setFontReady(true);
    });

    return () => {
      active = false;
    };
  }, [fontReady]);

  return useMemo(() => {
    // Sem a fonte pixelada carregada, o desenho sairia com a fonte de recuo e
    // congelaria assim — melhor a placa ficar em branco por um instante.
    if (!fontReady || typeof document === 'undefined') return { texture: null, aspect: 3 };

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return { texture: null, aspect: 3 };

    const font = `${fontSize * RESOLUTION}px ${FONT_FAMILY}`;
    context.font = font;

    const lines = wrap(context, text, (width - 20) * RESOLUTION);
    const lineHeight = fontSize * 1.6 * RESOLUTION;

    canvas.width = width * RESOLUTION;
    canvas.height = Math.max(lines.length * lineHeight + 16 * RESOLUTION, 40 * RESOLUTION);

    // Redefinir o tamanho do canvas zera o contexto, então a fonte volta aqui.
    context.font = font;
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    const centerX = canvas.width / 2;
    const startY = canvas.height / 2 - ((lines.length - 1) * lineHeight) / 2;

    lines.forEach((line, index) => {
      const y = startY + index * lineHeight;

      if (outline) {
        context.lineWidth = 6 * RESOLUTION * 0.5;
        context.strokeStyle = outline;
        context.lineJoin = 'round';
        context.strokeText(line, centerX, y);
      }

      context.fillStyle = color;
      context.fillText(line, centerX, y);
    });

    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    // Ampliação sem suavização mantém as bordas duras da fonte pixelada; a
    // redução continua suave para o texto não cintilar quando a placa é pequena.
    texture.magFilter = NearestFilter;
    texture.minFilter = LinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;

    return { texture, aspect: canvas.width / canvas.height };
  }, [text, width, fontSize, color, outline, fontReady]);
}

/** Quebra o texto em linhas que cabem na largura dada. */
function wrap(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
}
