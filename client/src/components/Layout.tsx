import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="navbar-brand">
          <h1>Jade</h1>
          <span className="subtitle">高速Markdownエディタ</span>
        </div>
        <div className="navbar-links">
          <Link
            to="/"
            className={location.pathname === '/' ? 'active' : ''}
          >
            エディタ
          </Link>
          <Link
            to="/graph"
            className={location.pathname === '/graph' ? 'active' : ''}
          >
            グラフ
          </Link>
        </div>
      </nav>
      <main className="layout-main">
        {children}
      </main>
    </div>
  );
}
