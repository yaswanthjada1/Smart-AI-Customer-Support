import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Send,
  Bot,
  User,
  Minus,
  RotateCcw,
  Sparkles,
  FileText,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

interface SourceCitation {
  document: string;
  document_id?: string;
  page?: number | null;
  section?: string | null;
  snippet?: string;
  similarity_score?: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceCitation[];
  escalation_required?: boolean;
  timestamp: string;
}

interface ChatbotConfig {
  company_name: string;
  bot_name: string;
  welcome_message: string;
  logo_url: string | null;
  primary_color: string;
}

export const WidgetChatPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const companyId = searchParams.get('companyId');

  const [config, setConfig] = useState<ChatbotConfig>({
    company_name: 'Customer Support',
    bot_name: 'Support Assistant',
    welcome_message: 'Hello! How can I help you today?',
    logo_url: null,
    primary_color: '#4f46e5',
  });

  const [loadingConfig, setLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sessionId, setSessionId] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Initialize session & load company configuration
  useEffect(() => {
    if (!companyId) {
      setConfigError('Missing company ID parameter.');
      setLoadingConfig(false);
      return;
    }

    // Session ID
    const storageKey = `aerorag_session_${companyId}`;
    let activeSession = localStorage.getItem(storageKey);
    if (!activeSession) {
      activeSession = `session_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
      localStorage.setItem(storageKey, activeSession);
    }
    setSessionId(activeSession);

    // Fetch Public Config
    const fetchConfig = async () => {
      try {
        const res = await fetch(`/api/public/config/${encodeURIComponent(companyId)}`);
        if (!res.ok) {
          throw new Error('Company chatbot not found or disabled.');
        }
        const data: ChatbotConfig = await res.json();
        setConfig(data);

        // Notify parent iframe wrapper of theme color
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'aerorag:set_primary_color', color: data.primary_color }, '*');
        }

        // Initialize greeting message
        setMessages([
          {
            id: 'welcome-msg',
            role: 'assistant',
            content: data.welcome_message || `Hello! Welcome to ${data.company_name} support. How can I help you today?`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } catch (err: any) {
        setConfigError(err.message || 'Failed to load chatbot configuration.');
      } finally {
        setLoadingConfig(false);
      }
    };

    fetchConfig();
  }, [companyId]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  // Handle minimize / close
  const handleClose = () => {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'aerorag:close' }, '*');
    }
  };

  // Reset conversation
  const handleReset = () => {
    if (!companyId) return;
    const newSession = `session_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
    localStorage.setItem(`aerorag_session_${companyId}`, newSession);
    setSessionId(newSession);
    setMessages([
      {
        id: 'welcome-msg-' + Date.now(),
        role: 'assistant',
        content: config.welcome_message || `Hello! Welcome to ${config.company_name} support. How can I help you today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  // Send message
  const handleSendMessage = async (e?: React.FormEvent, overrideText?: string) => {
    if (e) e.preventDefault();
    const textToSend = overrideText || inputMessage.trim();
    if (!textToSend || isSending || !companyId) return;

    const userMessage: Message = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsSending(true);

    try {
      const res = await fetch('/api/public/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          sessionId,
          message: textToSend,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate response.');
      }

      const botMessage: Message = {
        id: 'bot-' + Date.now(),
        role: 'assistant',
        content: data.answer || "I couldn't find enough information in the knowledge base to answer that.",
        sources: data.sources || [],
        escalation_required: data.escalation_required || false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      const errorMessage: Message = {
        id: 'err-' + Date.now(),
        role: 'assistant',
        content: err.message || "Sorry, I couldn't process that request right now.",
        escalation_required: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  if (loadingConfig) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="h-9 w-9 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent"></div>
        <p className="mt-3 text-xs font-medium text-slate-500">Connecting to support assistant...</p>
      </div>
    );
  }

  if (configError) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="mt-3 text-sm font-semibold text-slate-900">Chatbot Unavailable</h3>
        <p className="mt-1 text-xs text-slate-500 max-w-xs">{configError}</p>
      </div>
    );
  }

  const primaryColor = config.primary_color || '#4f46e5';

  return (
    <div className="flex h-screen w-screen flex-col bg-slate-50 font-sans text-slate-900 antialiased select-none">
      {/* 1. Header Bar */}
      <div
        className="flex items-center justify-between px-4 py-3 text-white shadow-sm transition-colors"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 shadow-inner backdrop-blur-sm">
            {config.logo_url ? (
              <img
                src={config.logo_url}
                alt={config.company_name}
                className="h-full w-full rounded-xl object-cover"
              />
            ) : (
              <Bot className="h-5 w-5 text-white" />
            )}
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400"></span>
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold tracking-tight leading-tight">{config.bot_name}</h2>
            <div className="flex items-center space-x-1.5 opacity-90">
              <span className="text-[11px] font-medium tracking-wide truncate">{config.company_name}</span>
              <span className="text-[10px] opacity-75">• AI Support</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={handleReset}
            title="Reset conversation"
            className="rounded-lg p-1.5 text-white/80 transition hover:bg-white/15 hover:text-white"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={handleClose}
            title="Minimize chat"
            className="rounded-lg p-1.5 text-white/80 transition hover:bg-white/15 hover:text-white"
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 2. Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/70">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} space-y-1`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed shadow-sm ${
                msg.role === 'user'
                  ? 'text-white font-medium rounded-br-xs'
                  : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs'
              }`}
              style={msg.role === 'user' ? { backgroundColor: primaryColor } : {}}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>

              {/* Source Citations */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center space-x-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    <FileText className="h-3 w-3 text-indigo-500" />
                    <span>Verified Knowledge Sources</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {msg.sources.map((s, idx) => (
                      <div
                        key={idx}
                        className="inline-flex items-center space-x-1 rounded-md bg-indigo-50/80 px-2 py-0.5 text-[10px] font-medium text-indigo-700 border border-indigo-100/80"
                        title={s.snippet || s.document}
                      >
                        <span className="truncate max-w-[150px]">{s.document}</span>
                        {s.page && <span className="opacity-75 font-normal">(p.{s.page})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Escalation Notice */}
              {msg.escalation_required && (
                <div className="mt-2.5 flex items-center justify-between rounded-lg bg-amber-50 p-2 text-[11px] text-amber-800 border border-amber-200/80">
                  <div className="flex items-center space-x-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>Support representative notified.</span>
                  </div>
                  <span className="font-semibold text-amber-900 underline cursor-pointer hover:opacity-80">
                    Contact Us
                  </span>
                </div>
              )}
            </div>

            <span className="text-[10px] text-slate-400 px-1">{msg.timestamp}</span>
          </div>
        ))}

        {/* Searching / Generating Indicator */}
        {isSending && (
          <div className="flex items-start space-y-1">
            <div className="flex items-center space-x-2 rounded-2xl rounded-bl-xs bg-white px-3.5 py-2.5 text-xs text-slate-500 border border-slate-200/80 shadow-sm">
              <div className="flex space-x-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500 [animation-delay:-0.3s]"></span>
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500 [animation-delay:-0.15s]"></span>
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500"></span>
              </div>
              <span className="font-medium text-slate-600">Searching knowledge base...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Quick Suggestions (when conversation is fresh) */}
      {messages.length <= 1 && (
        <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => handleSendMessage(undefined, 'How long do I have to return a product?')}
            className="shrink-0 text-[11px] font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-full px-3 py-1 shadow-xs transition"
          >
            📦 Return Policy
          </button>
          <button
            onClick={() => handleSendMessage(undefined, 'What is the warranty period for AeroFit treadmills?')}
            className="shrink-0 text-[11px] font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-full px-3 py-1 shadow-xs transition"
          >
            🛡️ Warranty Info
          </button>
          <button
            onClick={() => handleSendMessage(undefined, 'What are your shipping rates and delivery times?')}
            className="shrink-0 text-[11px] font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-full px-3 py-1 shadow-xs transition"
          >
            🚚 Shipping Rates
          </button>
        </div>
      )}

      {/* 4. Bottom Input */}
      <div className="border-t border-slate-200/80 bg-white p-3 shadow-md">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask a question..."
            disabled={isSending}
            className="flex-1 rounded-xl bg-slate-100 px-3.5 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 border border-slate-200 transition"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isSending}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-xs transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
            style={{ backgroundColor: primaryColor }}
          >
            <Send className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-1.5 flex items-center justify-center space-x-1 text-[10px] text-slate-400">
          <ShieldCheck className="h-3 w-3 text-emerald-500" />
          <span>Grounded in official company knowledge</span>
        </div>
      </div>
    </div>
  );
};
