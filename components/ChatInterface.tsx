

import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../types';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center space-x-1.5">
        <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"></div>
    </div>
);


const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleShare = (messageId: string, text: string) => {
    const encodedText = btoa(text);
    const shareUrl = `${window.location.origin}${window.location.pathname}?share=${encodedText}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
        setCopiedId(messageId);
        setTimeout(() => {
            setCopiedId(null);
        }, 2500);
    }).catch(err => {
        console.error('Failed to copy share link: ', err);
        alert('Failed to copy link.');
    });
  };

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };
  
  const suggestions = [
      "Summarize the key trends for this market.",
      "Compare the primary and comparison markets.",
      "How does this market compare to the national average?",
  ];

  const handleSuggestionClick = (suggestion: string) => {
    if (!isLoading) {
      onSendMessage(suggestion);
    }
  }

  return (
    <div className="bg-slate-800 rounded-lg shadow-lg flex flex-col h-[40rem]">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-xl font-semibold text-white">AI Analyst Chat</h2>
      </div>
      <div className="flex-grow p-4 overflow-y-auto">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col mb-4 items-${msg.sender === 'user' ? 'end' : 'start'}`}>
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                msg.sender === 'user' ? 'bg-sky-600 text-white' : 'bg-slate-700 text-gray-200'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.text}</p>
            </div>

            {msg.sender === 'ai' && msg.sources && msg.sources.length > 0 && (
                <div className="max-w-xs lg:max-w-md mt-2 p-2 bg-slate-700/50 rounded-lg border border-slate-600/50">
                    <h4 className="text-xs font-semibold text-slate-300 mb-1.5">Sources:</h4>
                    <ul className="space-y-1">
                        {msg.sources.map((source, index) => (
                            <li key={index} className="text-xs">
                                <a 
                                    href={source.uri} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-sky-400 hover:text-sky-300 truncate block"
                                    title={source.uri}
                                >
                                    {`[${index + 1}] ${source.title}`}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

             {msg.sender === 'ai' && msg.text.length > 0 && (
              <button 
                onClick={() => handleShare(msg.id, msg.text)}
                className={`mt-2 text-xs flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all duration-300 ${copiedId === msg.id ? 'bg-green-600 text-white' : 'bg-slate-600 hover:bg-slate-500 text-slate-300'}`}
                aria-label="Share this report"
                disabled={copiedId === msg.id}
              >
                {copiedId === msg.id ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                    </svg>
                    Share
                  </>
                )}
              </button>
            )}
          </div>
        ))}
        {isLoading && (
            <div className="flex justify-start mb-4">
                <div className="bg-slate-700 text-gray-200 px-4 py-3 rounded-lg">
                    <LoadingSpinner />
                </div>
            </div>
        )}
      </div>
      <div className="p-4 border-t border-slate-700">
        <div className="flex gap-2 mb-2 flex-wrap">
            {suggestions.map(s => (
                <button 
                    key={s}
                    onClick={() => handleSuggestionClick(s)}
                    disabled={isLoading}
                    className="text-xs bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 px-2 py-1 rounded-full transition-colors"
                >
                    {s}
                </button>
            ))}
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a comparative question..."
            className="flex-grow bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="bg-sky-500 hover:bg-sky-600 disabled:bg-sky-800 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;