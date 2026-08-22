import React from 'react';
import { Bot, Loader2 } from 'lucide-react';

export const LoadingScreen: React.FC<{ message?: string }> = ({ message = 'Loading workspace...' }) => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="relative flex items-center justify-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center animate-pulse">
          <Bot className="w-8 h-8 text-indigo-400" />
        </div>
        <div className="absolute -inset-1 rounded-2xl bg-indigo-500/20 blur-xl -z-10 animate-soft-glow" />
      </div>
      <div className="flex items-center gap-3 text-slate-300">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
        <span className="text-sm font-medium tracking-wide">{message}</span>
      </div>
    </div>
  );
};
