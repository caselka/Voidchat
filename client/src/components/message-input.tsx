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
      // Keep focus on input to maintain keyboard
      const input = e.currentTarget.querySelector('input');
      if (input) {
        setTimeout(() => {
          input.focus();
          input.click(); // Ensure keyboard stays visible on iOS
        }, 10);
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
    <div className="message-input-container bg-background/95 backdrop-blur-sm border-t border-border">
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
                onFocus={(e) => {
                  // Smooth scroll to input when keyboard appears
                  setTimeout(() => {
                    e.target.scrollIntoView({ 
                      behavior: 'smooth', 
                      block: 'nearest',
                      inline: 'nearest'
                    });
                  }, 300);
                }}
                placeholder="Text Message"
                className="message-input w-full px-4 py-3 bg-muted/50 border-0 rounded-full text-base focus-visible:ring-1 focus-visible:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                maxLength={maxLength}
                disabled={isRateLimited}
                autoComplete="off"
                spellCheck="false"
                inputMode="text"
              />
              <div className="absolute right-3 bottom-1 text-xs text-muted-foreground">
                {messageText.length}/{maxLength}
              </div>
            </div>
            
            <Button
              type="submit"
              disabled={!canSend}
              size="icon"
              className="h-11 w-11 rounded-full bg-blue-500 hover:bg-blue-600 disabled:bg-muted text-white disabled:text-muted-foreground shrink-0"
            >
              <Send className="w-5 h-5" />
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
