import React from 'react';
import { Link } from 'react-router-dom';
import { Plane, ArrowLeft } from 'lucide-react';
import Footer from '../rescue/Footer';

interface LegalLayoutProps {
  title: string;
  subtitle?: string;
  lastUpdated?: string;
  children: React.ReactNode;
}

const LegalLayout: React.FC<LegalLayoutProps> = ({ title, subtitle, lastUpdated = 'April 26, 2026', children }) => {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Slim legal header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center">
              <Plane className="w-4 h-4 text-white -rotate-45" />
            </div>
            <div>
              <p className="text-slate-900 font-bold leading-none">
                Connection<span className="text-red-600">Rescue</span>
              </p>
              <p className="text-slate-500 text-[10px] uppercase tracking-widest mt-0.5">Legal Center</p>
            </div>
          </Link>
          <Link to="/" className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition">
            <ArrowLeft className="w-4 h-4" /> Back to app
          </Link>
        </div>
      </header>

      {/* Page hero */}
      <div className="bg-gradient-to-b from-slate-50 to-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-red-600 mb-3">Legal</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight">{title}</h1>
          {subtitle && <p className="mt-3 text-slate-600 text-lg max-w-2xl">{subtitle}</p>}
          <p className="mt-4 text-sm text-slate-500">Last updated: {lastUpdated}</p>
        </div>
      </div>

      <main className="flex-1">
        <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 prose prose-slate prose-headings:font-bold prose-headings:text-slate-900 prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-3 prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-2 prose-p:text-slate-700 prose-p:leading-relaxed prose-li:text-slate-700 prose-strong:text-slate-900 prose-a:text-red-600 prose-a:no-underline hover:prose-a:underline">
          {children}
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default LegalLayout;
