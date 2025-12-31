import React, { useState, useRef, useEffect } from 'react';
import { Send, X, MessageCircle, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { createChatSession } from '../services/geminiService';
import { Chat } from '@google/genai';
import { NavigationRoute } from '../types';

interface ChatBotContext {
  screen: string;
  route?: NavigationRoute;
  destination?: string;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export const ChatBot: React.FC<{ onClose: () => void; context?: ChatBotContext }> = ({ onClose, context }) => {
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: 'init', 
      role: 'model', 
      text: "Hi! I'm your RouteLens Assistant. I can help you understand route safety scores, find landmarks, or answer navigation questions. How can I help?" 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  const chatSession = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Chat Session once
  useEffect(() => {
    let active = true;
    try {
      const session = createChatSession();
      if (active) {
        chatSession.current = session;
      }
    } catch (e) {
      console.error("Failed to init chat", e);
      if (active) {
        setMessages(prev => [...prev, { id: 'err', role: 'model', text: "Error: Could not connect to AI service. Check API Key." }]);
      }
    }
    return () => { active = false; };
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update suggestions based on context
  // CRITICAL FIX: Deconstruct context to primitives to avoid infinite loops if parent passes new object reference
  const screenContext = context?.screen;
  const routeId = context?.route?.id;
  const destinationContext = context?.destination;

  useEffect(() => {
    const newSuggestions: string[] = [];
    
    if (screenContext === 'NAV') {
        newSuggestions.push("Find nearest gas station", "Is there traffic ahead?", "Find a rest stop", "Call emergency services");
    } else if (routeId && (screenContext === 'SELECT' || screenContext === 'DETAILS')) {
        newSuggestions.push("Why is this route safer?", "What's the lighting score?", "Any warnings?", "Show landmarks");
    } else if (destinationContext && destinationContext.length > 0) {
        newSuggestions.push(`Is ${destinationContext} safe?`, "Parking near destination", "Best time to leave?");
    } else {
        newSuggestions.push("How does scoring work?", "Find nearby hospitals", "Safe route to City Center", "Travel safety tips");
    }
    
    setSuggestions(newSuggestions);
  }, [screenContext, routeId, destinationContext]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || !chatSession.current || isLoading) return;

    // Add User Message
    const userMsgId = Date.now().toString();
    setMessages(prev => [...prev, { id: userMsgId, role: 'user', text: text }]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatSession.current.sendMessage({ message: text });
      const responseText = response.text || "I'm having trouble thinking of a response right now.";
      
      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: 'model', 
        text: responseText 
      }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: 'model', 
        text: "Sorry, I encountered an error communicating with the server." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleChipClick = (text: string) => {
    sendMessage(text);
  };

  return (
    <div className="fixed bottom-24 right-4 z-50 w-80 md:w-96 h-[500px] max-h-[70vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 animate-fade-in-up overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-white">
          <div className="p-1.5 bg-blue-600 rounded-lg">
             <Sparkles size={16} className="text-white" />
          </div>
          <span className="font-bold text-sm">RouteLens Chat</span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'user' ? 'bg-indigo-100 text-indigo-600' : 'bg-blue-600 text-white'
            }`}>
              {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>
            
            <div className={`max-w-[80%] rounded-2xl p-3 text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-white border border-slate-200 text-slate-800 rounded-tr-none shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200' 
                : 'bg-blue-600 text-white rounded-tl-none shadow-md'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
           <div className="flex items-start gap-2">
             <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
               <Loader2 size={14} className="animate-spin" />
             </div>
             <div className="bg-slate-200 dark:bg-slate-800 rounded-2xl rounded-tl-none px-4 py-2 flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></div>
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer Area with Chips & Input */}
      <div className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0">
         {/* Suggestions chips */}
         <div className="px-4 pt-3 flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            {suggestions.map((s, i) => (
               <button 
                 key={i} 
                 onClick={() => handleChipClick(s)}
                 disabled={isLoading}
                 className="whitespace-nowrap flex-shrink-0 text-xs font-medium bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-300 px-3 py-1.5 rounded-full border border-blue-100 dark:border-slate-700 hover:bg-blue-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
               >
                 {s}
               </button>
            ))}
         </div>

         {/* Input Form */}
         <form onSubmit={handleSend} className="p-3 flex gap-2 pt-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
              disabled={isLoading}
            />
            <button 
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={18} />
            </button>
         </form>
      </div>
    </div>
  );
};