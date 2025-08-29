
import React from 'react';

interface SharedReportProps {
  content: string;
}

const SharedReport: React.FC<SharedReportProps> = ({ content }) => {
  return (
    <div className="min-h-screen bg-slate-900 text-gray-200 font-sans flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-lg shadow-lg w-full max-w-2xl p-6 lg:p-8 border border-slate-700">
        <header className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold text-sky-400">AI Real Estate Market Report</h1>
          <p className="text-slate-400 mt-1">A shared summary from the AI Real Estate Market Reporter</p>
        </header>
        <div className="bg-slate-700 p-4 rounded-lg">
          <p className="text-gray-200 whitespace-pre-wrap">{content}</p>
        </div>
        <div className="mt-6 text-center">
          <a
            href={window.location.pathname}
            className="inline-block bg-sky-600 hover:bg-sky-500 text-white font-semibold py-2 px-5 rounded-lg transition-colors"
          >
            Launch the Full App
          </a>
        </div>
      </div>
    </div>
  );
};

export default SharedReport;
