import { Component } from 'react'
import { AlertTriangle, RotateCcw, LayoutDashboard, Home } from 'lucide-react'

/**
 * Application-level error boundary. Any uncaught render/runtime error shows a
 * professional fallback page instead of a white screen.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[Synora] Interface error:', error, info?.componentStack)
    this.setState({ info })
  }

  handleReload = () => window.location.reload()

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    const { error, info } = this.state
    if (!error) return this.props.children

    const isDev = Boolean(import.meta.env?.DEV)

    return (
      <div style={{
        minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24,
        background: 'radial-gradient(1000px 500px at 50% -10%, #16305c 0%, #0a1128 60%), #0a1128',
        color: '#eef2ff', fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <div style={{
          maxWidth: 520, width: '100%', padding: 34, borderRadius: 22,
          background: 'rgba(16,26,58,.6)', border: '1px solid rgba(103,232,249,.16)',
          backdropFilter: 'blur(12px)', textAlign: 'center',
        }}>
          <div style={{
            width: 62, height: 62, margin: '0 auto 16px', borderRadius: 18,
            display: 'grid', placeItems: 'center',
            background: 'rgba(217,119,6,.15)', color: '#fbbf24',
          }}>
            <AlertTriangle size={30} />
          </div>
          <h1 style={{ fontSize: '1.5rem', letterSpacing: '-0.02em', marginBottom: 8 }}>
            Something went wrong
          </h1>
          <p style={{ color: '#b9c5e4', fontSize: '.95rem', marginBottom: 24 }}>
            Synora encountered an unexpected interface error. Your data is safe —
            reloading usually resolves this.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={this.handleReload}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 22px',
                borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 700,
                background: 'linear-gradient(135deg,#14b8a6,#22d3ee)', color: '#04252b' }}>
              <RotateCcw size={16} /> Reload Application
            </button>
            <button onClick={this.handleGoHome}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 22px',
                borderRadius: 12, cursor: 'pointer', fontWeight: 700,
                background: 'rgba(255,255,255,.08)', color: '#fff',
                border: '1px solid rgba(255,255,255,.18)' }}>
              <Home size={16} /> Go to Home
            </button>
          </div>
          {isDev && (
            <details style={{
              marginTop: 22, textAlign: 'left', fontSize: '.78rem', color: '#8fa0c8',
              background: 'rgba(0,0,0,.25)', borderRadius: 10, padding: 12,
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: 700, marginBottom: 6 }}>
                Developer details (dev builds only)
              </summary>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
                {String(error?.message || error)}
                {info?.componentStack ? `\n${info.componentStack}` : ''}
              </pre>
            </details>
          )}
        </div>
      </div>
    )
  }
}
