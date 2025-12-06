import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useNoteStore } from '../store/noteStore';
import './GraphPage.css';

interface GraphNode {
  id: string;
  title: string;
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
}

export function GraphPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const { notes, fetchNotes } = useNoteStore();
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [notesWithContent, setNotesWithContent] = useState<any[]>([]);

  // ノート一覧とコンテンツを取得
  useEffect(() => {
    const fetchAllNotes = async () => {
      await fetchNotes();
    };
    fetchAllNotes();
  }, [fetchNotes]);

  // すべてのノートのコンテンツを取得
  useEffect(() => {
    const fetchContents = async () => {
      const promises = notes.map(async (note) => {
        try {
          const response = await fetch(`/api/notes/${note.id}`);
          return await response.json();
        } catch (error) {
          console.error('Failed to fetch note content:', error);
          return note;
        }
      });
      const results = await Promise.all(promises);
      setNotesWithContent(results);
    };

    if (notes.length > 0) {
      fetchContents();
    }
  }, [notes]);

  useEffect(() => {
    // ノートからグラフデータを生成
    const graphNodes: GraphNode[] = notesWithContent.map(note => ({
      id: note.id,
      title: note.title,
    }));

    // リンクを抽出（簡易版）
    const graphLinks: GraphLink[] = [];
    notesWithContent.forEach(note => {
      if (note.content) {
        // [[リンク]] パターンを検索
        const linkPattern = /\[\[([^\]]+)\]\]/g;
        let match;
        while ((match = linkPattern.exec(note.content)) !== null) {
          const targetTitle = match[1];
          const target = notesWithContent.find(n => n.title === targetTitle);
          if (target) {
            graphLinks.push({
              source: note.id,
              target: target.id,
            });
          }
        }
      }
    });

    setNodes(graphNodes);
    setLinks(graphLinks);
  }, [notesWithContent]);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    svg.selectAll('*').remove();

    const g = svg.append('g');

    // ズーム機能
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // 力指向グラフシミュレーション
    const simulation = d3.forceSimulation(nodes as any)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(50));

    // リンク描画
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 2);

    // ノード描画
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .call(d3.drag<any, any>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any);

    node.append('circle')
      .attr('r', 20)
      .attr('fill', '#4ec9b0')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    node.append('text')
      .text((d: GraphNode) => d.title)
      .attr('x', 25)
      .attr('y', 5)
      .attr('fill', '#cccccc')
      .attr('font-size', '12px');

    // シミュレーション更新
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [nodes, links]);

  return (
    <div className="graph-page">
      <div className="graph-info">
        <h2>ノートグラフ</h2>
        <p>{nodes.length} ノード, {links.length} リンク</p>
      </div>
      <svg ref={svgRef} className="graph-svg" />
    </div>
  );
}
