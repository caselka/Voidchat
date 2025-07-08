import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Clock, Hourglass } from "lucide-react";

interface MessageInputProps {
  onSendMessage: (content: string, replyToId?: number) => void;
  rateLimitTime: number;
  error: string | null;
  replyingTo?: { id: number; content: string; username: string } | null;
  onCancelReply?: () => void;
  globalCooldown?: { active: boolean; timeLeft: number; reason: string };
}

export default function MessageInput({ 
  onSendMessage, 
  rateLimitTime, 
  error, 
  replyingTo, 
  onCancelReply,
  globalCooldown 
}: MessageInputProps) {
  const [messageText, setMessageText] = useState('');
  const maxLength = 500;
  const isRateLimited = rateLimitTime > 0;
  const isGlobalCooldown = globalCooldown?.active || false;
  const canSend = messageText.trim().length > 0 && !isRateLimited && !isGlobalCooldown;

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
      onSendMessage(messageText.trim(), replyingTo?.id);
      setMessageText('');
      onCancelReply?.();
      // Prevent keyboard from hiding by keeping focus
      const input = e.currentTarget.querySelector('input');
      setTimeout(() => input?.focus(), 50);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow plain text, prevent pasting of HTML/CSS
    const cleanValue = value.replace(/<[^>]*>/g, '').replace(/\{[^}]*\}/g, '');
    setMessageText(cleanValue);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border safe-area-inset-bottom z-40">
      <div className="max-w-4xl mx-auto px-3 md:px-4 py-3 md:py-4">
        {/* Reply Preview */}
        {replyingTo && (
          <div className="mb-3 p-3 bg-muted/50 border-l-4 border-blue-500 rounded-r-lg">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
                  Replying to {replyingTo.username}
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {replyingTo.content}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancelReply}
                className="ml-2 h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>
          </div>
        )}
        
        {/* Global Cooldown Warning */}
        {globalCooldown?.active && (
          <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center text-amber-800 dark:text-amber-200">
              <Hourglass className="w-4 h-4 mr-2" />
              <span className="text-sm">
                {globalCooldown.reason} ({globalCooldown.timeLeft}s left)
              </span>
            </div>
          </div>
        )}
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
                placeholder="Text Message"
                className="w-full px-4 py-3 bg-muted/50 border-0 rounded-full text-base focus-visible:ring-1 focus-visible:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                maxLength={maxLength}
                disabled={isRateLimited}
                autoComplete="off"
                spellCheck="false"
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
          {(error || isRateLimited || isGlobalCooldown) && (
            <div className="mt-2 px-4 text-xs text-destructive flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              {error || 
               (isGlobalCooldown ? `Global cooldown: ${globalCooldown?.timeLeft}s remaining` :
                `Wait ${rateLimitTime} seconds before sending another message`)}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
