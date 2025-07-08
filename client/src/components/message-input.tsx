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
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const maxLength = 500;
  const isRateLimited = rateLimitTime > 0;
  const canSend = messageText.trim().length > 0 && !isRateLimited;

  // Keyboard detection and locking mechanism
  useEffect(() => {
    const handleViewportChange = () => {
      const visualViewport = window.visualViewport;
      if (visualViewport) {
        const keyboardHeight = window.innerHeight - visualViewport.height;
        const isOpen = keyboardHeight > 100; // Threshold for keyboard detection
        
        setIsKeyboardOpen(isOpen);
        
        if (isOpen) {
          // Lock body scroll and position input above keyboard
          document.body.classList.add('ios-keyboard-open');
          if (containerRef.current) {
            containerRef.current.style.bottom = `${keyboardHeight}px`;
          }
        } else {
          // Restore normal positioning
          document.body.classList.remove('ios-keyboard-open');
          if (containerRef.current) {
            containerRef.current.style.bottom = '0px';
          }
        }
      }
    };

    // Listen for visual viewport changes (keyboard events)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      window.visualViewport.addEventListener('scroll', handleViewportChange);
    }

    // Fallback for older browsers
    const handleResize = () => {
      const heightDiff = window.screen.height - window.innerHeight;
      const isOpen = heightDiff > 150;
      setIsKeyboardOpen(isOpen);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
        window.visualViewport.removeEventListener('scroll', handleViewportChange);
      }
      window.removeEventListener('resize', handleResize);
      document.body.classList.remove('ios-keyboard-open');
    };
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
      ref={containerRef}
      className="message-input-container"
      style={{
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        backgroundColor: 'var(--bg)',
        borderTop: '1px solid var(--input-border)',
        position: 'fixed',
        zIndex: 1000,
        transform: 'translate3d(0, 0, 0)',
        willChange: 'transform'
      }}
    >
      <div className="max-w-4xl mx-auto" style={{ padding: '12px' }}>

        <form onSubmit={handleSubmit} className="w-full">
          <div 
            className="relative flex items-center transition-all duration-200"
            style={{
              backgroundColor: 'var(--input-bg)',
              border: '1px solid var(--input-border)',
              borderRadius: '10px',
              height: '40px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
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
                onFocus={() => {
                  // Prevent scroll when focusing on mobile
                  if (window.innerWidth <= 768) {
                    setTimeout(() => {
                      window.scrollTo(0, document.body.scrollHeight);
                    }, 100);
                  }
                }}
                onBlur={() => {
                  // Reset keyboard state when unfocused
                  setTimeout(() => {
                    setIsKeyboardOpen(false);
                    document.body.classList.remove('ios-keyboard-open');
                  }, 100);
                }}
                placeholder="Type a message..."
                className="message-input w-full resize-none border-none outline-none bg-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  color: 'var(--input-text)',
                  fontSize: '14px',
                  lineHeight: '1.4',
                  padding: '6px 10px',
                  height: '28px'
                }}
                maxLength={maxLength}
                disabled={isRateLimited}
                autoComplete="off"
                spellCheck="false"
                rows={1}
              />
            </div>
            
            <div className="flex items-center gap-1 px-2">
              <span 
                className="font-mono"
                style={{
                  color: 'var(--counter-color)',
                  fontSize: '10px'
                }}
              >
                {messageText.length}/{maxLength}
              </span>
              <Button
                type="submit"
                disabled={!canSend}
                size="sm"
                className="h-6 w-6 p-0 rounded shrink-0 transition-colors duration-200"
                style={{
                  backgroundColor: canSend ? 'var(--send-button)' : 'var(--send-button-disabled)',
                  color: 'white'
                }}
              >
                <Send className="w-3 h-3" />
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
