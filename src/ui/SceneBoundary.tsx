import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router';
import { content } from '../data';
import type { Locale } from '../data/schema';
import { t } from '../i18n/ui';

type Props = { children: ReactNode; locale: Locale };
type State = { error: Error | null };

/**
 * Limite de erro em volta da cena 3D.
 *
 * Existe por causa de uma falha real: a placa das construções carregava uma
 * fonte por URL, a URL passou a responder 404, e a cena inteira sumiu — o
 * usuário via só a cor do céu, sem nenhuma pista do que havia acontecido.
 *
 * Uma falha no mundo 3D não pode custar o acesso ao conteúdo. Aqui ela vira uma
 * mensagem visível e um caminho para a versão em texto, e o erro é registrado
 * no console em vez de desaparecer.
 */
export class SceneBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Falha ao montar a cena 3D:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const { locale } = this.props;

    return (
      <div className="notfound">
        <div className="notfound__panel frame">
          <h1>{content.profile.name}</h1>
          <p>{t('sceneFailed', locale)}</p>
          <Link className="info__cta" to="/">
            {t('skipGame', locale)}
          </Link>
        </div>
      </div>
    );
  }
}
