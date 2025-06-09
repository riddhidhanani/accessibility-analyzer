import { NextApiRequest, NextApiResponse } from 'next';
import pool from '../../src/lib/db'; // Adjust path

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const client = await pool.connect();
  try {
    // Fetch a list of overall analysis summaries
    const result = await client.query('SELECT id, url, timestamp, overall_score FROM analyses ORDER BY timestamp DESC LIMIT 50');
    res.status(200).json(result.rows);
  } catch (e: any) {
    console.error('Failed to fetch analyses list:', e);
    res.status(500).json({ message: 'Failed to fetch analyses list.', error: e.message });
  } finally {
    client.release();
  }
}