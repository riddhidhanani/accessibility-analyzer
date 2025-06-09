import { NextApiRequest, NextApiResponse } from 'next';
import lighthouse, { Flags } from 'lighthouse'; // Import Flags directly
import * as chromeLauncher from 'chrome-launcher';
import pool from '../../src/lib/db'; // Adjust path based on your src folder structure

// Define an interface for the issue object being inserted into the database
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

  let chrome: chromeLauncher.LaunchedChrome | undefined;
  try {
    // Launch headless Chrome
    chrome = await chromeLauncher.launch({
      chromeFlags: ['--headless=new', '--no-sandbox', '--disable-setuid-sandbox'], // --headless=new for newer headless mode
    });
    // Fix 1: Explicitly cast logLevel to the correct literal type
    const options: Flags = { logLevel: 'info', output: 'json', port: chrome.port }; // Use imported Flags

    // Run Lighthouse audit
    const runnerResult = await lighthouse(url, options);

    if (!runnerResult) {
        throw new Error('Lighthouse audit failed to return a result.');
    }

    const lhr = runnerResult.lhr;

    // Fix 2: Handle potentially null accessibility score
    const accessibilityScore = ((lhr.categories.accessibility?.score ?? 0) * 100).toFixed(2);

    // Save results to PostgreSQL
    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // Start transaction

        // Save overall analysis
        const analysisResult = await client.query(
            'INSERT INTO analyses (url, timestamp, overall_score, raw_lighthouse_report) VALUES ($1, NOW(), $2, $3) RETURNING id',
            [url, parseFloat(accessibilityScore), JSON.stringify(lhr)]
        );
        const analysisId = analysisResult.rows[0].id;

        // Fix 3: Explicitly type issuesToInsert
        const issuesToInsert: IssueToInsert[] = [];

        // Iterate through Lighthouse audits to find failed accessibility checks
        for (const auditKey in lhr.audits) {
            const audit = lhr.audits[auditKey];
            // Check if audit is related to accessibility and has failed items
            if (audit.score !== 1 && audit.details && audit.details.type === 'table' && audit.details.items) {
                audit.details.items.forEach((item: any) => {
                    issuesToInsert.push({
                        analysis_id: analysisId,
                        rule_id: audit.id,
                        description: item.helpText || audit.description,
                        impact: item.impact || 'moderate', // Lighthouse might provide 'impact'
                        html_snippet: item.node?.snippet || null, // Extract snippet from node
                    });
                });
            } else if (audit.score !== 1 && audit.details && audit.details.type === 'list' && audit.details.items) {
                // Handle list type audits (e.g., "Image elements do not have [alt] attributes")
                audit.details.items.forEach((item: any) => {
                    issuesToInsert.push({
                        analysis_id: analysisId,
                        rule_id: audit.id,
                        description: item.text || audit.description, // Use item.text for list items
                        impact: item.impact || 'moderate',
                        html_snippet: item.node?.snippet || null,
                    });
                });
            }
        }

        // Batch insert or individual inserts (individual for simplicity in example)
        for (const issue of issuesToInsert) {
            await client.query(
                'INSERT INTO accessibility_issues (analysis_id, rule_id, description, impact, html_snippet) VALUES ($1, $2, $3, $4, $5)',
                [issue.analysis_id, issue.rule_id, issue.description, issue.impact, issue.html_snippet]
            );
        }

        await client.query('COMMIT'); // Commit transaction

        res.status(200).json({ analysisId, accessibilityScore, message: 'Analysis complete.' });

    } catch (dbError) {
        await client.query('ROLLBACK'); // Rollback on error
        console.error('Database transaction failed:', dbError);
        throw new Error('Failed to save analysis results to database.');
    } finally {
        if (client) client.release(); // Ensure client is released even if rollback occurs
    }
  } catch (e: any) {
    console.error('Lighthouse or general analysis error:', e);
    // Attempt to parse error details if available, especially from Lighthouse
    const errorMessage = e.message || 'An unexpected error occurred during analysis.';
    res.status(500).json({ message: 'Analysis failed', error: errorMessage });
  } finally {
    if (chrome) {
      await chrome.kill(); // Ensure Chrome instance is closed
    }
  }
}

