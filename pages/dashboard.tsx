import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { format } from 'date-fns';
import Table from '../src/components/Table'; // Corrected import path for Table component
import { Clock, Loader2 } from 'lucide-react';

interface AnalysisSummary {
  id: number;
  url: string;
  timestamp: string;
  overall_score: number;
}

const DashboardPage: React.FC = () => {
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalyses = async () => {
      try {
        const response = await fetch('/api/analyses');
        if (!response.ok) {
          throw new Error('Failed to fetch analyses.');
        }
        const data: AnalysisSummary[] = await response.json();
        setAnalyses(data);
      } catch (err: any) {
        setError(err.message || 'An error occurred while fetching analyses.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalyses();
  }, []);

  // Explicitly type the columns array to match TableProps
  const columns: {
    key: keyof AnalysisSummary; // Ensures key is a valid property of AnalysisSummary
    header: string;
    render?: (item: AnalysisSummary) => React.ReactNode;
  }[] = [
    {
      key: 'url',
      header: 'URL',
      render: (item: AnalysisSummary) => (
        <Link href={`/analysis/${item.id}`} className="text-blue-600 hover:underline">
          {item.url}
        </Link>
      ),
    },
    {
      key: 'overall_score',
      header: 'Score',
      render: (item: AnalysisSummary) => (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
            item.overall_score >= 90 ? 'bg-green-100 text-green-800' :
            item.overall_score >= 50 ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
        }`}>
          {item.overall_score}%
        </span>
      ),
    },
    {
      key: 'timestamp',
      header: 'Analyzed On',
      render: (item: AnalysisSummary) => format(new Date(item.timestamp), 'MMM dd,PPPP HH:mm'), // Changed to 'yyyy' for full year
    },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] text-gray-600">
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <p className="mt-4 text-xl">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] text-red-600">
        <p className="text-xl">Error: {error}</p>
        <p className="text-md mt-2">Please try again later.</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Accessibility Analyzer - Dashboard</title>
        <meta name="description" content="View past accessibility analysis reports." />
      </Head>

      <div className="w-full max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 flex items-center space-x-3">
          <Clock size={32} className="text-blue-600" />
          <span>Past Analysis Reports</span>
        </h1>

        {analyses.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <p className="text-lg text-gray-600">No past analyses found. Start a <Link href="/" className="text-blue-600 hover:underline font-semibold">new scan</Link> to see results here!</p>
          </div>
        ) : (
          <Table data={analyses} columns={columns} />
        )}
      </div>
    </>
  );
};

export default DashboardPage;