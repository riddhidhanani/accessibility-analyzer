import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { format } from 'date-fns';
import Card from '../../src/components/Card';
import Table from '../../src/components/Table'; // Corrected import path for Table component
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { PieChart, Pie, Sector, Cell as PieCell } from 'recharts';
import { CheckCircle, XCircle, AlertTriangle, Info, Clock, Link as LinkIcon, Code, Zap } from 'lucide-react';
import Link from 'next/link';

interface Analysis {
  id: number;
  url: string;
  timestamp: string;
  overall_score: number;
  raw_lighthouse_report: any; // Store as JSONB in DB, so this can be a generic object
}

interface AccessibilityIssue {
  id: number;
  analysis_id: number;
  rule_id: string; // The Lighthouse audit ID (e.g., 'color-contrast')
  description: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor' | string;
  html_snippet: string | null;
  created_at: string;
}

// New interface for grouped issues
interface GroupedIssue {
  rule_id: string;
  description: string;
  impact: string;
  count: number; // How many times this particular issue description occurred
  snippets: (string | null)[]; // All HTML snippets related to this issue
  // Optional: add a link to a detailed explanation if it exists in Lighthouse report
  helpUrl?: string;
}


const getImpactColor = (impact: string) => {
  switch (impact.toLowerCase()) {
    case 'critical': return 'text-red-600';
    case 'serious': return 'text-orange-500';
    case 'moderate': return 'text-yellow-600';
    case 'minor': return 'text-blue-500';
    default: return 'text-gray-500';
  }
};

const getImpactIcon = (impact: string) => {
  switch (impact.toLowerCase()) {
    case 'critical': return <XCircle size={18} className="inline-block mr-1 text-red-600" />;
    case 'serious': return <AlertTriangle size={18} className="inline-block mr-1 text-orange-500" />;
    case 'moderate': return <Info size={18} className="inline-block mr-1 text-yellow-600" />;
    case 'minor': return <CheckCircle size={18} className="inline-block mr-1 text-blue-500" />;
    default: return <Info size={18} className="inline-block mr-1 text-gray-500" />;
  }
};

const AnalysisDetail: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [issues, setIssues] = useState<AccessibilityIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupedIssues, setGroupedIssues] = useState<GroupedIssue[]>([]);


  useEffect(() => {
    if (id) {
      const fetchAnalysis = async () => {
        try {
          const response = await fetch(`/api/analysis/${id}`);
          if (!response.ok) {
            throw new Error('Failed to fetch analysis details.');
          }
          const data = await response.json();
          setAnalysis(data.analysis);
          setIssues(data.issues);

          // --- Process issues for grouping ---
          const issuesMap = new Map<string, GroupedIssue>();

          data.issues.forEach((issue: AccessibilityIssue) => {
            // Use description as the primary key for grouping
            const key = issue.description;
            if (!issuesMap.has(key)) {
              issuesMap.set(key, {
                rule_id: issue.rule_id,
                description: issue.description,
                impact: issue.impact,
                count: 0,
                snippets: [],
                // Try to find helpUrl from the raw report if possible
                helpUrl: data.analysis.raw_lighthouse_report?.audits?.[issue.rule_id]?.helpUrl
              });
            }
            const grouped = issuesMap.get(key)!;
            grouped.count++;
            if (issue.html_snippet) {
                grouped.snippets.push(issue.html_snippet);
            }
          });
          setGroupedIssues(Array.from(issuesMap.values()));


        } catch (err: any) {
          setError(err.message || 'An error occurred while fetching analysis.');
        } finally {
          setIsLoading(false);
        }
      };
      fetchAnalysis();
    }
  }, [id]);

  // Explicitly type the columns array to match TableProps
  const issueColumns: {
    key: keyof GroupedIssue; // Now referencing GroupedIssue
    header: string;
    render?: (item: GroupedIssue) => React.ReactNode;
  }[] = [
    {
      key: 'impact',
      header: 'Impact',
      render: (item: GroupedIssue) => (
        <span className={`font-semibold ${getImpactColor(item.impact)} flex items-center`}>
          {getImpactIcon(item.impact)} {item.impact.charAt(0).toUpperCase() + item.impact.slice(1)}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (item: GroupedIssue) => (
        <>
          <p className="font-medium text-gray-900">{item.description}</p>
          {item.helpUrl && (
            <a href={item.helpUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-sm flex items-center mt-1">
              <LinkIcon size={14} className="mr-1" /> Learn More
            </a>
          )}
        </>
      ),
    },
    {
      key: 'count',
      header: 'Occurrences',
      render: (item: GroupedIssue) => (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
          {item.count}
        </span>
      ),
    },
    {
      key: 'snippets',
      header: 'Affected Elements (Snippets)',
      render: (item: GroupedIssue) => (
        item.snippets && item.snippets.length > 0 ? (
          <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar p-2 bg-gray-50 rounded-md border border-gray-200">
            {item.snippets.map((snippet, idx) => (
              <code key={idx} className="bg-gray-100 text-gray-800 p-1 rounded-sm text-xs block break-words whitespace-pre-wrap">
                {snippet}
              </code>
            ))}
          </div>
        ) : (
          <span className="text-gray-500 italic">N/A</span>
        )
      ),
    },
  ];

  // Prepare data for charts
  const impactDistribution = issues.reduce((acc, issue) => {
    const impact = issue.impact.charAt(0).toUpperCase() + issue.impact.slice(1);
    acc[impact] = (acc[impact] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieChartData = Object.entries(impactDistribution).map(([name, value]) => ({ name, value }));
  const PIE_COLORS = ['#EF4444', '#F97316', '#F59E0B', '#3B82F6']; // Red, Orange, Amber, Blue for Critical, Serious, Moderate, Minor

  // Modified: Data for Accessibility Audit Categories (based on grouped issues)
  // Group issues by rule_id for a more meaningful "category score" display
  const auditCategoryData = groupedIssues.reduce((acc, issue) => {
    if (!acc[issue.rule_id]) {
      acc[issue.rule_id] = { name: issue.rule_id, count: 0, totalImpact: 0 };
    }
    acc[issue.rule_id].count += issue.count;
    // Assign a numeric value to impact for sorting/coloring, if desired for a score
    // For now, we'll just count issues per rule
    return acc;
  }, {} as Record<string, {name: string; count: number; totalImpact: number}>); // Using totalImpact for potential future scoring

  const barChartData = Object.entries(auditCategoryData)
    .map(([rule_id, data]) => ({
      name: (analysis?.raw_lighthouse_report?.audits?.[rule_id]?.title || rule_id).replace('Does not have a ', ''), // Use Lighthouse audit title if available
      issuesCount: data.count,
    }))
    .sort((a, b) => b.issuesCount - a.issuesCount); // Sort by most issues first

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] text-gray-600">
        <Zap className="animate-pulse text-blue-600" size={48} />
        <p className="mt-4 text-xl">Fetching analysis results...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] text-red-600">
        <p className="text-xl">Error: {error}</p>
        <p className="text-md mt-2">Could not load analysis details.</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] text-gray-600">
        <Info size={48} />
        <p className="mt-4 text-xl">Analysis not found.</p>
        <Link href="/dashboard" className="text-blue-600 hover:underline mt-2">Go to Dashboard</Link>
      </div>
    );
  }

  // Adjusted card colors based on counts for impressiveness
  const overallScoreColor =
    analysis.overall_score >= 90 ? 'bg-green-100 text-green-800' :
    analysis.overall_score >= 50 ? 'bg-yellow-100 text-yellow-800' :
    'bg-red-100 text-red-800';

  const totalIssuesColor = issues.length > 0 ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800';
  const criticalIssuesColor = issues.filter(issue => issue.impact === 'critical').length > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';


  return (
    <>
      <Head>
        <title>Analysis Report for {analysis.url}</title>
        <meta name="description" content={`Detailed accessibility report for ${analysis.url}`} />
      </Head>

      <div className="w-full max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 break-words">
          Analysis Report for <a href={analysis.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{analysis.url}</a>
        </h1>
        <p className="text-gray-500 mb-8 flex items-center space-x-2">
          <Clock size={16} />
          <span>Analyzed on {format(new Date(analysis.timestamp), 'PPPp')}</span>
        </p>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Card
            title="Overall Score"
            value={`${analysis.overall_score}%`}
            colorClass={overallScoreColor}
            icon={<Zap size={28} />}
            description="Lighthouse Accessibility Score"
          />
          <Card
            title="Total Issues Found"
            value={issues.length}
            colorClass={totalIssuesColor} // Adjusted color
            icon={issues.length > 0 ? <XCircle size={28} /> : <CheckCircle size={28} />} // Adjusted icon
            description="Number of detected accessibility issues"
          />
          <Card
            title="Critical Issues"
            value={issues.filter(issue => issue.impact === 'critical').length}
            colorClass={criticalIssuesColor} // Adjusted color
            icon={issues.filter(issue => issue.impact === 'critical').length > 0 ? <XCircle size={28} /> : <CheckCircle size={28} />} // Adjusted icon
            description="Highest priority issues"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          {/* Impact Distribution Chart */}
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Issues by Impact Severity</h2>
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {pieChartData.map((entry, index) => (
                      <PieCell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number, name: string) => [`${value} issues`, name]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-500 mt-4">No issues to display in chart.</p>
            )}
          </div>

          {/* Accessibility Audit Categories (Bar Chart - now shows issue count per category) */}
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Issues by Accessibility Category</h2>
            {barChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={barChartData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  layout="vertical" // Make it a horizontal bar chart
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
                  <XAxis type="number" label={{ value: 'Number of Issues', position: 'insideBottom', offset: 0 }} />
                  <Tooltip formatter={(value: number, name: string) => [`${value} issues`, name]} />
                  <Bar dataKey="issuesCount" fill="#8884d8">
                    {barChartData.map((entry, index) => (
                      // A nice shade of indigo/blue
                      <Cell key={`cell-${index}`} fill="#4F46E5" /> 
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-500 mt-4">No categorized issues to display.</p>
            )}
          </div>
        </div>


        {/* Detailed Issues Table */}
        <div className="mb-10">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
            <LinkIcon size={24} className="text-blue-600" />
            <span>Detailed Accessibility Issues ({groupedIssues.length} unique types)</span> {/* Changed count to unique types */}
          </h2>
          {groupedIssues.length > 0 ? (
             <Table data={groupedIssues} columns={issueColumns} />
          ) : (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <p className="text-lg text-gray-600">No detailed issues found for this analysis, or all issues passed!</p>
            </div>
          )}
        </div>

        {/* Raw Report (Optional: for debugging/advanced users) */}
        {/* <div className="bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Raw Lighthouse Report</h2>
          <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto text-sm max-h-96">
            <code>{JSON.stringify(analysis.raw_lighthouse_report, null, 2)}</code>
          </pre>
        </div> */}
      </div>
    </>
  );
};

export default AnalysisDetail;
