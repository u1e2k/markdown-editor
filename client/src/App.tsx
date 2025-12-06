import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { EditorPage } from './pages/EditorPage';
import { GraphPage } from './pages/GraphPage';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<EditorPage />} />
            <Route path="/graph" element={<GraphPage />} />
          </Routes>
        </Layout>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
