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

  // Smooth scroll to bottom on new messages and after sending
  useEffect(() => {
    if (!messageText) { // Message was just sent (cleared)
      setTimeout(() => {
        const messagesArea = document.querySelector('.chat-messages-area');
        if (messagesArea) {
          messagesArea.scrollTo({ 
            top: messagesArea.scrollHeight, 
            behavior: 'smooth' 
          });
        }
      }, 50);
    }
  }, [messageText]);

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 px-4 pb-[env(safe-area-inset-bottom)] bg-background/80 backdrop-blur">
      <form onSubmit={handleSubmit} className="w-full py-3">
        <div 
          className="relative flex items-center transition-all duration-200 max-w-4xl mx-auto"
          style={{
            backgroundColor: 'var(--input-bg)',
            border: '1px solid var(--input-border)',
            borderRadius: '0.75rem', // 12px soft rounded corners
            minHeight: '44px',
            maxHeight: '120px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)'
          }}
        >
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
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            onFocus={() => {
              // Smooth scroll to bottom when input is focused
              setTimeout(() => {
                const messagesArea = document.querySelector('.chat-messages-area');
                if (messagesArea) {
                  messagesArea.scrollTo({
                    top: messagesArea.scrollHeight,
                    behavior: 'smooth'
                  });
                }
              }, 100);
            }}
            placeholder={isRateLimited ? `Wait ${rateLimitTime}s...` : "Message the void"}
            className="discord-input flex-1 resize-none border-none outline-none disabled:opacity-50 disabled:cursor-not-allowed selectable bg-transparent message-fade-in"
            style={{
              fontSize: '1rem',
              fontFamily: 'var(--font-base)',
              fontWeight: 'var(--font-weight-normal)',
              lineHeight: 'var(--line-height)',
              padding: '0.75rem 1rem',
              borderRadius: '0.75rem',
              minHeight: '44px',
              maxHeight: '120px',
              backgroundColor: 'transparent',
              color: 'var(--text)',
              resize: 'none',
              touchAction: 'manipulation',
              outline: 'none',
              border: 'none'
            }}
            maxLength={maxLength}
            disabled={isRateLimited}
            autoComplete="off"
            spellCheck="false"
            inputMode="text"
            autoCapitalize="sentences"
            autoCorrect="on"
            rows={1}
            aria-label="Type your message"
            data-testid="message-input"
          />
          
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
                height: '44px', // Apple's 44px minimum touch target
                width: '44px',
                borderRadius: '0.5rem'
              }}
              aria-label="Send message"
              data-testid="send-button"
            >
              {isRateLimited ? (
                <Clock className="w-5 h-5 button-icon" />
              ) : (
                <Send className="w-5 h-5 button-icon" />
              )}
            </Button>
          </div>
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
