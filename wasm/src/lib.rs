use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

// ブロック署名構造体
#[derive(Serialize, Deserialize, Clone)]
pub struct BlockSignature {
    pub block_index: usize,
    pub weak_checksum: u32,  // Adler-32
    pub strong_hash: String, // MD5
}

// デルタ命令
#[derive(Serialize, Deserialize)]
pub enum DeltaInstruction {
    Copy { block_index: usize },
    Insert { data: Vec<u8> },
}

// デルタファイル
#[derive(Serialize, Deserialize)]
pub struct DeltaFile {
    pub instructions: Vec<DeltaInstruction>,
}

// ノードポジション（グラフビジュアライゼーション用）
#[derive(Serialize, Deserialize)]
pub struct NodePosition {
    pub id: String,
    pub x: f64,
    pub y: f64,
}

// リンク構造体
#[derive(Serialize, Deserialize)]
pub struct Link {
    pub source: String,
    pub target: String,
}

// Adler-32チェックサムを計算
fn adler32_checksum(data: &[u8]) -> u32 {
    adler32::adler32(data).unwrap_or(0)
}

// MD5ハッシュを計算
fn md5_hash(data: &[u8]) -> String {
    format!("{:x}", md5::compute(data))
}

// ブロック署名を生成 (サーバー側でも使用)
#[wasm_bindgen]
pub fn generate_signatures(content: &str, block_size: usize) -> String {
    let bytes = content.as_bytes();
    let mut signatures = Vec::new();

    for (i, chunk) in bytes.chunks(block_size).enumerate() {
        signatures.push(BlockSignature {
            block_index: i,
            weak_checksum: adler32_checksum(chunk),
            strong_hash: md5_hash(chunk),
        });
    }

    serde_json::to_string(&signatures).unwrap_or_else(|_| "[]".to_string())
}

// デルタを計算 (ローリングチェックサムを使用)
#[wasm_bindgen]
pub fn compute_delta(signatures_json: &str, new_content: &str, block_size: usize) -> String {
    let signatures: Vec<BlockSignature> = serde_json::from_str(signatures_json)
        .unwrap_or_else(|_| Vec::new());
    
    let new_bytes = new_content.as_bytes();
    let mut instructions = Vec::new();
    let mut i = 0;
    
    // 署名をハッシュマップに変換（高速検索用）
    let mut sig_map: std::collections::HashMap<u32, Vec<&BlockSignature>> = 
        std::collections::HashMap::new();
    
    for sig in &signatures {
        sig_map.entry(sig.weak_checksum)
            .or_insert_with(Vec::new)
            .push(sig);
    }

    let mut insert_buffer = Vec::new();

    while i < new_bytes.len() {
        let end = std::cmp::min(i + block_size, new_bytes.len());
        let chunk = &new_bytes[i..end];
        let weak = adler32_checksum(chunk);
        
        let mut found = false;
        
        // 弱いチェックサムでマッチを探す
        if let Some(candidates) = sig_map.get(&weak) {
            // 強いハッシュで確認
            let strong = md5_hash(chunk);
            for sig in candidates {
                if sig.strong_hash == strong {
                    // マッチ発見 - COPY命令
                    if !insert_buffer.is_empty() {
                        instructions.push(DeltaInstruction::Insert {
                            data: insert_buffer.clone(),
                        });
                        insert_buffer.clear();
                    }
                    instructions.push(DeltaInstruction::Copy {
                        block_index: sig.block_index,
                    });
                    found = true;
                    i += chunk.len();
                    break;
                }
            }
        }
        
        if !found {
            // マッチなし - バッファに追加
            insert_buffer.push(new_bytes[i]);
            i += 1;
        }
    }

    // 残りのバッファをINSERT命令として追加
    if !insert_buffer.is_empty() {
        instructions.push(DeltaInstruction::Insert {
            data: insert_buffer,
        });
    }

    let delta = DeltaFile { instructions };
    serde_json::to_string(&delta).unwrap_or_else(|_| "{}".to_string())
}

// Markdownからリンクを抽出（簡易版のみ使用）
#[wasm_bindgen]
pub fn extract_links(content: &str, note_id: &str) -> String {
    extract_links_simple(content, note_id)
}

// 簡易版リンク抽出（regexなし）
#[wasm_bindgen]
pub fn extract_links_simple(content: &str, note_id: &str) -> String {
    let mut links = Vec::new();
    let bytes = content.as_bytes();
    let mut i = 0;
    
    while i < bytes.len() {
        // "[[" を探す
        if i + 1 < bytes.len() && bytes[i] == b'[' && bytes[i + 1] == b'[' {
            i += 2;
            let start = i;
            
            // "]]" を探す
            while i + 1 < bytes.len() {
                if bytes[i] == b']' && bytes[i + 1] == b']' {
                    if let Ok(target) = std::str::from_utf8(&bytes[start..i]) {
                        links.push(Link {
                            source: note_id.to_string(),
                            target: target.to_string(),
                        });
                    }
                    i += 2;
                    break;
                }
                i += 1;
            }
        } else {
            i += 1;
        }
    }
    
    serde_json::to_string(&links).unwrap_or_else(|_| "[]".to_string())
}

// グラフレイアウト計算（力指向アルゴリズム）
#[wasm_bindgen]
pub fn compute_graph_layout(nodes_json: &str, links_json: &str, iterations: usize) -> String {
    #[derive(Deserialize)]
    struct Node {
        id: String,
    }
    
    let nodes: Vec<Node> = serde_json::from_str(nodes_json).unwrap_or_else(|_| Vec::new());
    let links: Vec<Link> = serde_json::from_str(links_json).unwrap_or_else(|_| Vec::new());
    
    // ノードの初期位置をランダムに設定
    let mut positions: Vec<NodePosition> = nodes.iter().enumerate().map(|(i, node)| {
        NodePosition {
            id: node.id.clone(),
            x: (i as f64 * 100.0) % 500.0,
            y: (i as f64 * 100.0) % 500.0,
        }
    }).collect();
    
    // 力指向アルゴリズム
    let k = 100.0; // バネ定数
    let c = 0.1;   // 減衰係数
    
    for _ in 0..iterations {
        let mut forces: Vec<(f64, f64)> = vec![(0.0, 0.0); positions.len()];
        
        // 反発力（すべてのノード間）
        for i in 0..positions.len() {
            for j in 0..positions.len() {
                if i != j {
                    let dx = positions[i].x - positions[j].x;
                    let dy = positions[i].y - positions[j].y;
                    let dist = (dx * dx + dy * dy).sqrt().max(0.1);
                    let force = k * k / dist;
                    forces[i].0 += force * dx / dist;
                    forces[i].1 += force * dy / dist;
                }
            }
        }
        
        // 引力（リンクで結ばれたノード間）
        for link in &links {
            if let (Some(src_idx), Some(tgt_idx)) = (
                positions.iter().position(|p| p.id == link.source),
                positions.iter().position(|p| p.id == link.target),
            ) {
                let dx = positions[tgt_idx].x - positions[src_idx].x;
                let dy = positions[tgt_idx].y - positions[src_idx].y;
                let dist = (dx * dx + dy * dy).sqrt().max(0.1);
                let force = dist * dist / k;
                forces[src_idx].0 += force * dx / dist;
                forces[src_idx].1 += force * dy / dist;
                forces[tgt_idx].0 -= force * dx / dist;
                forces[tgt_idx].1 -= force * dy / dist;
            }
        }
        
        // 位置更新
        for i in 0..positions.len() {
            positions[i].x += forces[i].0 * c;
            positions[i].y += forces[i].1 * c;
        }
    }
    
    serde_json::to_string(&positions).unwrap_or_else(|_| "[]".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_signatures() {
        let content = "Hello, World!";
        let result = generate_signatures(content, 4);
        assert!(!result.is_empty());
    }

    #[test]
    fn test_extract_links_simple() {
        let content = "This is a [[link]] to [[another page]].";
        let result = extract_links_simple(content, "test-note");
        assert!(result.contains("link"));
        assert!(result.contains("another page"));
    }
}
