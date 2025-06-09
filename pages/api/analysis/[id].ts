import { NextApiRequest, NextApiResponse } from 'next';
import pool from '../../../src/lib/db'; // Adjust path

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { id } = req.query; // Get ID from dynamic route parameter
  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ message: 'Valid Analysis ID is required.' });
  }

  const client = await pool.connect();
  try {
    // Fetch main analysis record
    const analysisResult = await client.query('SELECT * FROM analyses WHERE id = $1', [id]);
    if (analysisResult.rows.length === 0) {
      return res.status(404).json({ message: 'Analysis not found.' });
    }
    const analysis = analysisResult.rows[0];

    // Fetch associated accessibility issues
    const issuesResult = await client.query('SELECT * FROM accessibility_issues WHERE analysis_id = $1 ORDER BY impact DESC, rule_id ASC', [id]);
    const issues = issuesResult.rows;

    res.status(200).json({
      analysis: analysis,
      issues: issues,
    });
  } catch (e: any) {
    console.error('Failed to fetch analysis details:', e);
    res.status(500).json({ message: 'Failed to fetch analysis details.', error: e.message });
  } finally {
    client.release();
  }
}
