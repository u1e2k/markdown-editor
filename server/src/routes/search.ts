import { Router, Request, Response } from 'express';
import { elasticClient } from '../services';

export const searchRouter = Router();

// 全文検索
searchRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const result = await elasticClient.search({
      index: 'notes',
      body: {
        query: {
          multi_match: {
            query: q as string,
            fields: ['title^2', 'content'],
            fuzziness: 'AUTO',
          },
        },
        size: parseInt(limit as string),
        highlight: {
          fields: {
            title: {},
            content: {},
          },
        },
      },
    });

    const hits = result.hits.hits.map((hit: any) => ({
      id: hit._id,
      ...hit._source,
      highlights: hit.highlight,
      score: hit._score,
    }));

    res.json({ 
      total: result.hits.total,
      hits,
    });
  } catch (error) {
    console.error('Error searching notes:', error);
    res.status(500).json({ error: 'Failed to search notes' });
  }
});
