import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          maxWidth: '800px',
          margin: '0 auto',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <h1 style={{ color: '#dc2626' }}>⚠️ エラーが発生しました</h1>
          
          <div style={{
            background: '#fee2e2',
            border: '1px solid #dc2626',
            borderRadius: '8px',
            padding: '20px',
            marginTop: '20px'
          }}>
            <h2 style={{ marginTop: 0 }}>エラー詳細:</h2>
            <pre style={{
              background: '#fff',
              padding: '15px',
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '14px'
            }}>
              {this.state.error && this.state.error.toString()}
            </pre>
            
            {this.state.errorInfo && (
              <details style={{ marginTop: '15px' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                  スタックトレースを表示
                </summary>
                <pre style={{
                  background: '#fff',
                  padding: '15px',
                  borderRadius: '4px',
                  overflow: 'auto',
                  fontSize: '12px',
                  marginTop: '10px'
                }}>
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>

          <div style={{
            background: '#dbeafe',
            border: '1px solid #3b82f6',
            borderRadius: '8px',
            padding: '20px',
            marginTop: '20px'
          }}>
            <h3 style={{ marginTop: 0 }}>💡 トラブルシューティング:</h3>
            <ol style={{ paddingLeft: '20px' }}>
              <li><strong>APIサーバーが起動しているか確認:</strong>
                <pre style={{ background: '#fff', padding: '10px', borderRadius: '4px', marginTop: '5px' }}>
cd server && bun run dev
                </pre>
              </li>
              <li><strong>Dockerサービスが起動しているか確認:</strong>
                <pre style={{ background: '#fff', padding: '10px', borderRadius: '4px', marginTop: '5px' }}>
docker compose ps
docker compose up -d
                </pre>
              </li>
              <li><strong>ブラウザのコンソールでエラーを確認</strong> (F12キーを押す)</li>
              <li><strong>ページをリロード</strong> (Ctrl+R または Cmd+R)</li>
            </ol>
          </div>

          <button
            onClick={() => {
              this.setState({ hasError: false, error: null, errorInfo: null });
              window.location.reload();
            }}
            style={{
              marginTop: '20px',
              padding: '12px 24px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            🔄 ページをリロード
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
