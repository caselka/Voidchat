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
    <div 
      className="fixed bottom-0 inset-x-0 z-50 px-4 bg-background/90 backdrop-blur-md border-t border-subtle"
      style={{
        paddingBottom: `calc(0.75rem + env(safe-area-inset-bottom, 0px) + env(keyboard-inset-height, 0px))`
      }}
    >
      <form onSubmit={handleSubmit} className="w-full py-3 pt-[0px] pb-[0px]">
        <div 
          className="relative flex items-center max-w-4xl mx-auto"
          style={{
            backgroundColor: 'var(--input-bg)',
            border: '2px solid var(--input-border)',
            borderRadius: '0.75rem',
            minHeight: '44px',
            maxHeight: '120px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <textarea
            ref={textareaRef}
            value={messageText}
            onChange={handleInputChange}
            onPaste={(e) => {
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
            className="flex-1 resize-none bg-transparent message-fade-in"
            style={{
              fontSize: '1rem',
              fontFamily: 'var(--font-base)',
              fontWeight: 'var(--font-weight-normal)',
              lineHeight: '1.5',
              padding: '0.875rem 1rem',
              borderRadius: '0.625rem',
              minHeight: '44px',
              maxHeight: '120px',
              color: 'var(--text)',
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              caretColor: 'var(--text)',
              touchAction: 'manipulation',
              textRendering: 'optimizeLegibility',
              WebkitTextSizeAdjust: '100%',
              opacity: isRateLimited ? 0.5 : 1,
              cursor: isRateLimited ? 'not-allowed' : 'text'
            }}
            maxLength={maxLength}
            disabled={isRateLimited}
            autoComplete="off"
            spellCheck="true"
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
                <Clock className="w-4 h-4 button-icon" />
              ) : (
                <svg 
                  className="w-4 h-4 button-icon" 
                  viewBox="0 0 16 16" 
                  fill="currentColor"
                >
                  <path d="M15.854.146a.5.5 0 0 1 .11.54L13.026 8.74a.5.5 0 0 1-.708.233L8.5 7.326V12.5a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5V7.326L2.682 8.973a.5.5 0 0 1-.708-.233L-.954.686a.5.5 0 0 1 .11-.54.5.5 0 0 1 .54-.11L8 2.88 16.304.036a.5.5 0 0 1 .55.11z"/>
                </svg>
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
