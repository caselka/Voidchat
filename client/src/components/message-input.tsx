import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Clock, Hourglass } from "lucide-react";
import { useIOSKeyboard } from "@/hooks/use-ios-keyboard";

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
  const { keyboardHeight, isKeyboardOpen, inputRef } = useIOSKeyboard();
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
    <div 
      ref={inputRef}
      className="message-input-container"
      style={{
        position: 'fixed',
        bottom: isKeyboardOpen ? `${keyboardHeight}px` : '0px',
        left: 0,
        right: 0,
        width: '100%',
        backgroundColor: 'var(--bg)',
        borderTop: '1px solid var(--input-border)',
        zIndex: 1000,
        transition: 'bottom 0.2s ease-out',
        paddingBottom: 'env(safe-area-inset-bottom)',
        transform: 'translate3d(0,0,0)', // Hardware acceleration to prevent scroll movement
        willChange: 'transform', // Optimize for transform changes
        touchAction: 'none' // Prevent touch scroll on input container
      }}
    >
      <div 
        className="max-w-4xl mx-auto" 
        style={{ 
          padding: '12px',
          transform: 'translate3d(0,0,0)', // Ensure input area stays fixed
          position: 'relative'
        }}
      >

        <form onSubmit={handleSubmit} className="w-full">
          <div 
            className="relative flex items-center transition-all duration-200"
            style={{
              backgroundColor: 'var(--input-bg)',
              border: '1px solid var(--input-border)',
              borderRadius: '0.5rem',
              minHeight: '44px',
              boxShadow: 'none'
            }}
          >
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                onFocus={(e) => {
                  // Prevent scroll movement on focus - keep input fixed
                  e.target.scrollIntoView = () => {}; // Disable scrollIntoView
                  
                  // Scroll content area to bottom instead of moving input
                  setTimeout(() => {
                    const chatContainer = document.querySelector('.chat-container');
                    if (chatContainer) {
                      chatContainer.scrollTop = chatContainer.scrollHeight;
                    } else {
                      // Fallback to window scroll
                      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                    }
                  }, 100);
                }}
                onBlur={() => {
                  // Blur handling is now managed by useIOSKeyboard hook
                }}
                placeholder={isRateLimited ? `Wait ${rateLimitTime}s...` : "Type a message..."}
                className="message-input w-full resize-none border-none outline-none bg-transparent disabled:opacity-50 disabled:cursor-not-allowed selectable"
                style={{
                  color: 'var(--text)',
                  fontSize: '16px', // Prevent iOS zoom
                  lineHeight: '1.5',
                  padding: '0.75rem 1rem',
                  minHeight: '32px',
                  transform: 'translate3d(0,0,0)', // Hardware acceleration
                  willChange: 'height', // Optimize for height changes only
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
                className="p-0 shrink-0 transition-colors duration-200 border-0 focus:outline-none"
                style={{
                  backgroundColor: canSend ? 'var(--send-button)' : 'var(--send-button-disabled)',
                  color: canSend ? 'var(--bg)' : 'var(--text-subtle)',
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
