import React from 'react';

type Props = { children: React.ReactNode };

type State = { hasError: boolean };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(err: unknown) {
    console.error('[ErrorBoundary]', err);
  }

  render() {
    return this.state.hasError ? (
      <div style={{ padding: 16 }}>
        Ocorreu um erro. Recarregue a página.
      </div>
    ) : (
      this.props.children
    );
  }
}
