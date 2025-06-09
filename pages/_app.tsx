import '../src/styles/globals.css';
import type { AppProps } from 'next/app';
import Navbar from '../src/components/Navbar';

// Corrected: Changed to a const arrow function
const App = ({ Component, pageProps }: AppProps) => {
  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-64px)] flex flex-col items-center py-8 px-4 sm:px-6 lg:px-8">
        <Component {...pageProps} />
      </main>
    </>
  );
};

export default App;