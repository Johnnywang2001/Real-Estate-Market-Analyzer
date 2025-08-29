
import React, { useState, useEffect } from 'react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
  currentKey: string | null;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave, currentKey }) => {
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    if (currentKey) {
      setApiKey(currentKey);
    } else {
      setApiKey('');
    }
  }, [currentKey, isOpen]);

  const handleSave = () => {
    onSave(apiKey.trim());
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="apiKeyModalTitle">
      <div className="bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md border border-slate-700">
        <div className="flex justify-between items-center mb-4">
          <h2 id="apiKeyModalTitle" className="text-xl font-bold text-white">Gemini API Key Settings</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-3xl leading-none" aria-label="Close settings modal">&times;</button>
        </div>
        <p className="text-slate-400 mb-4">
          To power the AI features, you need a free API key from Google AI Studio.
        </p>
        <div className="mb-4">
          <label htmlFor="apiKeyInput" className="block text-sm font-medium text-slate-300 mb-2">
            Your Gemini API Key
          </label>
          <input
            id="apiKeyInput"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your API key"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 text-sm">
          Get your Gemini API key here &rarr;
        </a>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} className="px-4 py-2 bg-sky-600 hover:bg-sky-500 rounded-lg text-white font-semibold transition-colors">
            Save Key
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
