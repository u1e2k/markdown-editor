import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { EditorPage } from './pages/EditorPage';
import { GraphPage } from './pages/GraphPage';
import { Layout } from './components/Layout';
import './App.css';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<EditorPage />} />
          <Route path="/graph" element={<GraphPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
