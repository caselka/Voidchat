import { useState, useEffect, useRef } from "react";
import { Send, Paperclip, Mic, Hash } from "lucide-react";
import { useWebSocket } from "@/hooks/use-websocket";
import { cn } from "@/lib/utils";

interface Message {
  id: number;
  content: string;
  username: string;
  timestamp: string;
}

export default function SimpleChat() {
  const { messages, sendMessage, isConnected } = useWebSocket();
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    if (!inputText.trim() || !isConnected) return;
    
    try {
      await sendMessage(inputText.trim());
      setInputText("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return "now";
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-screen bg-slate-800 text-white">
      {/* Header - Exact Replit Style */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 bg-purple-600 rounded-md flex items-center justify-center">
            <div className="w-3 h-3 grid grid-cols-2 gap-0.5">
              <div className="w-1 h-1 bg-white rounded-sm"></div>
              <div className="w-1 h-1 bg-white rounded-sm"></div>
              <div className="w-1 h-1 bg-white rounded-sm"></div>
              <div className="w-1 h-1 bg-white rounded-sm"></div>
            </div>
          </div>
          <span className="text-lg font-medium">Agent</span>
        </div>
      </div>

      {/* Messages - Exact Replit Style */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-4">
          {messages.map((message) => {
            const messageData = message.data || message;
            const content = messageData.content;
            const username = messageData.username;
            const timestamp = messageData.timestamp || messageData.createdAt;
            
            if (!content) return null;

            return (
              <div key={messageData.id || Math.random()} className="space-y-2">
                {/* Message content with no bubble - just text */}
                <div className="text-gray-200 text-[15px] leading-relaxed whitespace-pre-wrap">
                  {content}
                </div>
                
                {/* Timestamp */}
                <div className="text-xs text-gray-500">
                  {formatTime(timestamp)}
                </div>
              </div>
            );
          })}
          
          {/* Show typing indicator if not connected */}
          {!isConnected && (
            <div className="flex items-center space-x-2 text-purple-400">
              <div className="w-6 h-6 bg-purple-600 rounded-md flex items-center justify-center">
                <div className="w-3 h-3 grid grid-cols-2 gap-0.5">
                  <div className="w-1 h-1 bg-white rounded-sm"></div>
                  <div className="w-1 h-1 bg-white rounded-sm"></div>
                  <div className="w-1 h-1 bg-white rounded-sm"></div>
                  <div className="w-1 h-1 bg-white rounded-sm"></div>
                </div>
              </div>
              <span className="text-sm">Connecting...</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area - Exact Replit Style */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-end space-x-3">
          {/* Attachment button */}
          <button className="w-9 h-9 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-gray-400">
            <Paperclip className="w-4 h-4" />
          </button>
          
          {/* Input field */}
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Message Agent..."
              disabled={!isConnected}
              className="w-full bg-slate-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 border-0 focus:outline-none focus:ring-1 focus:ring-purple-500 text-[15px]"
              style={{ fontSize: "16px" }} // Prevent zoom on iOS
            />
          </div>
          
          {/* Voice button */}
          <button className="w-9 h-9 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-gray-400">
            <Mic className="w-4 h-4" />
          </button>
          
          {/* Hash button */}
          <button className="w-9 h-9 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-gray-400">
            <Hash className="w-4 h-4" />
          </button>
          
          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || !isConnected}
            className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center transition-all",
              inputText.trim() && isConnected
                ? "bg-purple-600 hover:bg-purple-700 text-white"
                : "bg-slate-700 text-gray-500 cursor-not-allowed"
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}