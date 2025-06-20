import { NextApiRequest, NextApiResponse } from 'next';
import lighthouse from 'lighthouse';
import puppeteer from 'puppeteer'; 
import pool from '../../src/lib/db';

interface IssueToInsert {
  analysis_id: number;
  rule_id: string;
  description: string;
  impact: string;
  html_snippet: string | null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ message: 'URL is required.' });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: 'new' as any,
    });

    const endpoint = browser.wsEndpoint();
    const port = Number(new URL(endpoint).port);

    const result = await lighthouse(url, {
      logLevel: 'info',
      output: 'json',
      port,
    });

    if (!result) throw new Error('Lighthouse did not return a result.');

    const lhr = result.lhr;
    const accessibilityScore = ((lhr.categories.accessibility?.score ?? 0) * 100).toFixed(2);


    console.log('🧪 DATABASE_URL (from analyze.ts):', process.env.DATABASE_URL);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const analysisResult = await client.query(
        'INSERT INTO analyses (url, timestamp, overall_score, raw_lighthouse_report) VALUES ($1, NOW(), $2, $3) RETURNING id',
        [url, parseFloat(accessibilityScore), JSON.stringify(lhr)]
      );
      const analysisId = analysisResult.rows[0].id;

      const issuesToInsert: IssueToInsert[] = [];

      for (const auditKey in lhr.audits) {
        const audit = lhr.audits[auditKey];
        if (
          audit.score !== 1 &&
          audit.details &&
          'items' in audit.details &&
          Array.isArray(audit.details.items)
        ) {
          for (const item of audit.details.items) {
            issuesToInsert.push({
              analysis_id: analysisId,
              rule_id: audit.id,
              description: item.helpText || item.text || audit.description,
              impact: item.impact || 'moderate',
              html_snippet: item.node?.snippet || null,
            });
          }
        }
      }

      for (const issue of issuesToInsert) {
        await client.query(
          'INSERT INTO accessibility_issues (analysis_id, rule_id, description, impact, html_snippet) VALUES ($1, $2, $3, $4, $5)',
          [issue.analysis_id, issue.rule_id, issue.description, issue.impact, issue.html_snippet]
        );
      }

      await client.query('COMMIT');
      res.status(200).json({ analysisId, accessibilityScore, message: 'Analysis complete.' });

    } catch (dbError) {
      await client.query('ROLLBACK');
      throw new Error('Database transaction failed: ' + (dbError instanceof Error ? dbError.message : String(dbError)));
    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('Lighthouse or general analysis error:', error);
    res.status(500).json({ message: 'Analysis failed', error: error.message });
  } finally {
    if (browser) await browser.close();
  }
}

