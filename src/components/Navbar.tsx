import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

const Navbar: React.FC = () => {
  return (
    <nav className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 shadow-lg sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="flex items-center space-x-2 text-white text-2xl font-bold rounded-md px-3 py-1 hover:bg-blue-700 transition-colors">
            <ShieldCheck size={32} />
            <span>A11y Analyzer</span>
        </Link>
        <div className="space-x-4">
          <Link href="/" className="text-white hover:text-blue-200 transition-colors font-medium text-lg px-3 py-2 rounded-md hover:bg-blue-600">
            New Scan
          </Link>
          <Link href="/dashboard" className="text-white hover:text-blue-200 transition-colors font-medium text-lg px-3 py-2 rounded-md hover:bg-blue-600">
            Dashboard
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
