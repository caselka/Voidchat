import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Clock, Hourglass } from "lucide-react";

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  rateLimitTime: number;
  error: string | null;
}

export default function MessageInput({ 
  onSendMessage, 
  rateLimitTime, 
  error
}: MessageInputProps) {
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
      // Keep focus on input to maintain keyboard without scrolling
      const input = e.currentTarget.querySelector('input');
      if (input) {
        input.focus();
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow plain text, prevent pasting of HTML/CSS
    const cleanValue = value.replace(/<[^>]*>/g, '').replace(/\{[^}]*\}/g, '');
    setMessageText(cleanValue);
  };

  return (
    <div className="message-input-container">
      <div className="max-w-4xl mx-auto px-3 md:px-4 py-3 md:py-4">

        <form onSubmit={handleSubmit}>
          <div className="flex items-center bg-muted/30 dark:bg-muted/50 border border-border rounded-lg p-1">
            <input
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
              placeholder="Type a message..."
              className="message-input flex-1 bg-transparent border-none outline-none text-foreground dark:text-foreground placeholder:text-muted-foreground dark:placeholder:text-muted-foreground text-base px-4 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              maxLength={maxLength}
              disabled={isRateLimited}
              autoComplete="off"
              spellCheck="false"
              inputMode="text"
            />
            <div className="text-xs text-muted-foreground dark:text-muted-foreground px-2">
              {messageText.length}/{maxLength}
            </div>
            <Button
              type="submit"
              disabled={!canSend}
              size="sm"
              className="h-8 px-4 bg-blue-500 hover:bg-blue-600 disabled:bg-muted dark:disabled:bg-muted text-white disabled:text-muted-foreground dark:disabled:text-muted-foreground shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Error Messages */}
          {(error || isRateLimited) && (
            <div className="mt-2 px-4 text-xs text-destructive flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              {error || `Wait ${rateLimitTime} seconds before sending another message`}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
