import { useState } from 'react';
import Head from 'next/head';
import InputForm from '../src/components/InputForm';
import { useRouter } from 'next/router';

const HomePage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleAnalyze = async (url: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to analyze URL.');
      }

      const data = await response.json();
      router.push(`/analysis/${data.analysisId}`);
    } catch (error: any) {
      console.error('Error during analysis:', error);
      setErrorMessage(error.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Accessibility Analyzer - New Scan</title>
        <meta name="description" content="Analyze website accessibility with Lighthouse and Axe-core." />
      </Head>

      <div className="flex flex-col items-center justify-center w-full py-8 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-6 drop-shadow-md">
          Analyze Website Accessibility
        </h1>
        <p className="text-lg text-gray-600 mb-10 max-w-xl">
          Enter a URL below to get a comprehensive accessibility report powered by Lighthouse and Axe-core.
        </p>

        <InputForm onSubmit={handleAnalyze} isLoading={isLoading} />

        {isLoading && (
          <p className="mt-6 text-blue-600 text-lg flex items-center space-x-2">
            <svg className="animate-spin h-5 w-5 mr-3 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Analyzing... This might take a moment.
          </p>
        )}
        {errorMessage && (
          <p className="mt-6 text-red-600 text-lg">Error: {errorMessage}</p>
        )}

        <div className="mt-16 w-full max-w-4xl text-left">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">How it works:</h2>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>Enter any valid URL.</li>
            <li>Our system uses Google Lighthouse and Deque's Axe-core to perform an automated accessibility audit.</li>
            <li>Get a detailed report including an overall accessibility score, identified issues, and suggestions for improvement.</li>
            <li>All your past scans are saved and accessible from the Dashboard.</li>
          </ul>
        </div>
      </div>
    </>
  );
};

export default HomePage;