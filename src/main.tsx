import { StrictMode, Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Simple inline ErrorBoundary to catch rendering errors and avoid a blank page
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'sans-serif', textAlign: 'center', color: '#c00' }}>
          <h1>⚠️ Error al cargar la aplicación</h1>
          <p>Por favor, recarga la página. Si el problema persiste, verifica las variables de entorno en Vercel.</p>
          <details style={{ marginTop: '1rem', textAlign: 'left', background: '#f9f9f9', padding: '1rem', borderRadius: '8px' }}>
            <summary>Detalles del error</summary>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error?.message}</pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

