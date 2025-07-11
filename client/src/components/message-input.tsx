import { useState, useEffect, useRef } from "react";
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const maxLength = 500;
  const isRateLimited = rateLimitTime > 0;
  const canSend = messageText.trim().length > 0 && !isRateLimited;

  // Auto-focus on load for better UX
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

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
      // Add send animation
      const button = e.currentTarget.querySelector('.discord-send-button');
      if (button) {
        button.classList.add('sending-animation');
        setTimeout(() => button.classList.remove('sending-animation'), 200);
      }
      
      onSendMessage(messageText.trim());
      setMessageText('');
      
      // Keep focus on textarea to maintain keyboard without scrolling
      const textarea = e.currentTarget.querySelector('textarea');
      if (textarea) {
        textarea.focus();
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    // Only allow plain text, prevent pasting of HTML/CSS
    const cleanValue = value.replace(/<[^>]*>/g, '').replace(/\{[^}]*\}/g, '');
    setMessageText(cleanValue);
    
    // Auto-resize textarea like Replit AI
    const textarea = e.target;
    textarea.style.height = 'auto';
    const scrollHeight = Math.min(textarea.scrollHeight, 120); // Max height 120px
    textarea.style.height = `${Math.max(44, scrollHeight)}px`;
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="w-full p-4 pl-[9px] pr-[9px]">
        <div className="flex-1 overflow-hidden">
              <textarea
                ref={textareaRef}
                value={messageText}
                onChange={handleInputChange}
                onPaste={(e) => {
                  // Prevent pasting of potentially dangerous content
                  e.preventDefault();
                  const paste = e.clipboardData.getData('text/plain');
                  const cleanPaste = paste.replace(/<[^>]*>/g, '').replace(/\{[^}]*\}/g, '');
                  setMessageText(prev => (prev + cleanPaste).substring(0, maxLength));
                }}
                
                onFocus={() => {
                  // Scroll the chat messages area to bottom when input is focused
                  setTimeout(() => {
                    const messagesArea = document.querySelector('.chat-messages-area');
                    if (messagesArea) {
                      messagesArea.scrollTo({
                        top: messagesArea.scrollHeight,
                        behavior: 'smooth'
                      });
                    }
                  }, 150);
                }}
                placeholder={isRateLimited ? `Wait ${rateLimitTime}s...` : "Message #voidchat"}
                className="discord-input w-full resize-none border-none outline-none disabled:opacity-50 disabled:cursor-not-allowed selectable pt-[10px] pb-[10px] pl-[15px] pr-[15px] ml-[0px] mr-[0px] bg-[#e4e5e6cf]"
                style={{
                  color: 'var(--text)',
                  fontSize: '1rem', // 16px using rem units
                  lineHeight: '1.5',
                  padding: '0.75rem 1rem',
                  minHeight: '2.75rem', // 44px touch target in rem
                  borderRadius: '0.75rem',
                  touchAction: 'manipulation' // Prevent double-tap zoom
                }}
                maxLength={maxLength}
                disabled={isRateLimited}
                autoComplete="off"
                spellCheck="false"
                rows={1}
              />
            </div>
            
            <div className="flex items-center gap-2 px-3">
              <span 
                style={{
                  color: 'var(--text-subtle)',
                  fontSize: '0.75rem'
                }}
              >
                {messageText.length}/{maxLength}
              </span>
              <Button
                type="submit"
                disabled={!canSend}
                size="sm"
                className="discord-send-button p-0 shrink-0 transition-colors duration-200 border-0 focus:outline-none"
                style={{
                  height: '32px',
                  width: '32px',
                  borderRadius: '0.25rem'
                }}
              >
                {isRateLimited ? (
                  <Clock className="w-4 h-4" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          
        {/* Error Messages */}
        {(error || isRateLimited) && (
          <div className="mt-2 px-4 text-xs text-destructive flex items-center justify-center max-w-4xl mx-auto">
            <Clock className="w-3 h-3 mr-1" />
            {error || `Wait ${rateLimitTime} seconds before sending another message`}
          </div>
        )}
      </form>
    </div>
  );
}
