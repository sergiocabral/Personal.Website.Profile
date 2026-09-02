import { Fragment, type ReactNode } from 'react';

/**
 * Markdown reduzido, só o que a bio precisa: parágrafos separados por linha em
 * branco, `**negrito**` e `[texto](url)`.
 *
 * O site anterior guardava HTML cru no dado e o injetava com html-react-parser.
 * Aqui o dado é texto e o React monta os elementos, então não existe caminho
 * para injeção nem dependência extra.
 */

const TOKEN = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  TOKEN.lastIndex = 0;
  while ((match = TOKEN.exec(text)) !== null) {
    if (match.index > cursor) {
      nodes.push(text.slice(cursor, match.index));
    }

    const [, bold, linkText, linkHref] = match;
    if (bold !== undefined) {
      nodes.push(<strong key={`${keyPrefix}-b${match.index}`}>{bold}</strong>);
    } else if (linkText !== undefined && linkHref !== undefined) {
      nodes.push(
        <a
          key={`${keyPrefix}-a${match.index}`}
          href={linkHref}
          target="_blank"
          rel="noopener noreferrer"
        >
          {linkText}
        </a>,
      );
    }

    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
}

export function Markdown({ text, className }: { text: string; className?: string }) {
  const paragraphs = text.split(/\n\s*\n/).filter((paragraph) => paragraph.trim().length > 0);

  return (
    <div className={className}>
      {paragraphs.map((paragraph, index) => (
        <p key={index}>
          <Fragment>{renderInline(paragraph.trim(), `p${index}`)}</Fragment>
        </p>
      ))}
    </div>
  );
}
