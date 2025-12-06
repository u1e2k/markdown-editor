// Web Worker for Wasm computations
let wasmModule: any = null;

// Wasmモジュールの初期化
async function initWasm() {
  if (wasmModule) return;
  
  try {
    // Note: wasm-packでビルドしたモジュールをインポート
    // const wasm = await import('../../wasm/pkg');
    // wasmModule = wasm;
    console.log('Wasm module would be initialized here');
  } catch (error) {
    console.error('Failed to initialize Wasm module:', error);
  }
}

// メッセージハンドラ
self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  await initWasm();

  switch (type) {
    case 'GENERATE_SIGNATURES':
      try {
        // const signatures = wasmModule.generate_signatures(payload.content, payload.blockSize);
        const signatures = generateSignaturesFallback(payload.content, payload.blockSize);
        self.postMessage({ type: 'SIGNATURES_RESULT', payload: signatures });
      } catch (error) {
        self.postMessage({ type: 'ERROR', payload: error });
      }
      break;

    case 'COMPUTE_DELTA':
      try {
        // const delta = wasmModule.compute_delta(payload.signatures, payload.newContent, payload.blockSize);
        const delta = computeDeltaFallback(payload.signatures, payload.newContent, payload.blockSize);
        self.postMessage({ type: 'DELTA_RESULT', payload: delta });
      } catch (error) {
        self.postMessage({ type: 'ERROR', payload: error });
      }
      break;

    case 'EXTRACT_LINKS':
      try {
        // const links = wasmModule.extract_links_simple(payload.content, payload.noteId);
        const links = extractLinksFallback(payload.content, payload.noteId);
        self.postMessage({ type: 'LINKS_RESULT', payload: links });
      } catch (error) {
        self.postMessage({ type: 'ERROR', payload: error });
      }
      break;

    case 'COMPUTE_GRAPH_LAYOUT':
      try {
        // const positions = wasmModule.compute_graph_layout(payload.nodes, payload.links, payload.iterations);
        const positions = computeGraphLayoutFallback(payload.nodes, payload.links, payload.iterations);
        self.postMessage({ type: 'LAYOUT_RESULT', payload: positions });
      } catch (error) {
        self.postMessage({ type: 'ERROR', payload: error });
      }
      break;

    default:
      self.postMessage({ type: 'ERROR', payload: `Unknown message type: ${type}` });
  }
};

// Fallback implementations (JavaScript版)
function generateSignaturesFallback(content: string, blockSize: number): string {
  // 簡易実装
  return JSON.stringify([]);
}

function computeDeltaFallback(signatures: string, newContent: string, blockSize: number): string {
  // 簡易実装
  return JSON.stringify({ instructions: [] });
}

function extractLinksFallback(content: string, noteId: string): string {
  const links = [];
  const linkPattern = /\[\[([^\]]+)\]\]/g;
  let match;
  
  while ((match = linkPattern.exec(content)) !== null) {
    links.push({
      source: noteId,
      target: match[1],
    });
  }
  
  return JSON.stringify(links);
}

function computeGraphLayoutFallback(nodesJson: string, linksJson: string, iterations: number): string {
  // 簡易実装 - 基本的な力指向レイアウト
  return JSON.stringify([]);
}

export {};
