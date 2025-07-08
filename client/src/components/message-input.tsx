import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Clock, Hourglass } from "lucide-react";

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  rateLimitTime: number;
  error: string | null;
}

export default function MessageInput({ onSendMessage, rateLimitTime, error }: MessageInputProps) {
  const [messageText, setMessageText] = useState('');
  const maxLength = 500;
  const isRateLimited = rateLimitTime > 0;
  const canSend = messageText.trim().length > 0 && !isRateLimited;

  // Basic client-side security validation
  const isSecureMessage = (content: string): boolean => {
    const forbiddenPatterns = [
      /<[^>]*>/,  // HTML tags
      /javascript:/i,  // JavaScript protocol
      /on\w+\s*=/i,  // Event handlers
      /@import/i,  // CSS imports
      /url\s*\(/i,  // CSS url()
      /expression\s*\(/i,  // CSS expressions
      /\{[^}]*\}/,  // CSS blocks
      /&#x/i,  // HTML entities
      /data:/i,  // Data URLs
      /\/api\//i,  // API endpoints
    ];
    
    return !forbiddenPatterns.some(pattern => pattern.test(content));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (canSend && isSecureMessage(messageText)) {
      onSendMessage(messageText.trim());
      setMessageText('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow plain text, prevent pasting of HTML/CSS
    const cleanValue = value.replace(/<[^>]*>/g, '').replace(/\{[^}]*\}/g, '');
    setMessageText(cleanValue);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 border-t border-border safe-area-inset-bottom">
      <div className="max-w-4xl mx-auto px-3 md:px-4 py-3 md:py-4">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center space-x-2 md:space-x-3">
            <div className="flex-1 relative">
              <Input
                type="text"
                value={messageText}
                onChange={handleInputChange}
                onPaste={(e) => {
                  // Prevent pasting of potentially dangerous content
                  e.preventDefault();
                  const paste = e.clipboardData.getData('text/plain');
                  const cleanPaste = paste.replace(/<[^>]*>/g, '').replace(/\{[^}]*\}/g, '');
                  setMessageText(prev => (prev + cleanPaste).substring(0, maxLength));
                }}
                placeholder="Type your message into the void..."
                className="w-full px-3 md:px-4 py-2 md:py-3 bg-input border border-border rounded-lg font-mono text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                maxLength={maxLength}
                disabled={isRateLimited}
                autoComplete="off"
                spellCheck="false"
              />
              <div className="absolute right-2 md:right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
                {messageText.length}/{maxLength}
              </div>
            </div>
            
            <Button
              type="submit"
              disabled={!canSend}
              className="px-3 md:px-6 py-2 md:py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-void-300 disabled:dark:bg-void-700 text-white rounded-lg transition-colors disabled:cursor-not-allowed flex items-center space-x-1 md:space-x-2"
            >
              <span className="text-xs md:text-sm">Send</span>
              <Send className="w-3 h-3" />
            </Button>
          </div>
          
          {/* Error Messages */}
          {error && (
            <div className="mt-2 text-xs text-red-500 dark:text-red-400 flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              {error}
            </div>
          )}
          
          {/* Rate Limit Warning */}
          {isRateLimited && (
            <div className="mt-2 text-xs text-red-500 dark:text-red-400 flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              Wait {rateLimitTime} seconds before sending another message
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
