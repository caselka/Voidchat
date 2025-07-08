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
      className="input-container"
      style={{
        transform: isKeyboardOpen ? 'translateZ(0)' : undefined,
      }}
    >
        <form onSubmit={handleSubmit} className="flex items-center gap-3 w-full">
          <div className="flex-1 relative">
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
                  // Enhanced mobile keyboard handling
                  if (window.innerWidth <= 768) {
                    const scrollY = window.scrollY;
                    document.body.classList.add('input-locked');
                    document.body.style.position = 'fixed';
                    document.body.style.top = `-${scrollY}px`;
                    document.body.style.width = '100%';
                    document.body.style.height = '100vh';
                    document.body.style.overflow = 'hidden';
                    
                    // Mark container as keyboard active
                    if (containerRef.current) {
                      containerRef.current.classList.add('keyboard-active');
                    }
                  }
                }}
                onBlur={() => {
                  // Restore scroll position with delay for keyboard animation
                  if (window.innerWidth <= 768) {
                    setTimeout(() => {
                      const scrollY = document.body.style.top;
                      document.body.classList.remove('input-locked');
                      document.body.style.position = '';
                      document.body.style.top = '';
                      document.body.style.width = '';
                      document.body.style.height = '';
                      document.body.style.overflow = '';
                      
                      if (containerRef.current) {
                        containerRef.current.classList.remove('keyboard-active');
                      }
                      
                      // Restore scroll position
                      const targetScrollY = parseInt(scrollY || '0') * -1;
                      window.scrollTo(0, targetScrollY);
                    }, 150); // Delay for keyboard animation
                  }
                  
                  // Reset keyboard state
                  setTimeout(() => {
                    setIsKeyboardOpen(false);
                    document.body.classList.remove('ios-keyboard-open');
                  }, 200);
                }}
                placeholder="Type a message..."
                className="message-input-field"
                maxLength={maxLength}
                disabled={isRateLimited}
                autoComplete="off"
                spellCheck="false"
                rows={1}
                style={{
                  fontSize: '16px',
                  lineHeight: '24px',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
            />
            
            {/* Character Counter */}
            <div className="character-counter">
              {messageText.length}/{maxLength}
            </div>
          </div>
          
          <button
            type="submit"
            disabled={!canSend}
            className="send-button"
          >
            {isRateLimited ? (
              <Hourglass className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
          
          {/* Rate limit and error indicators - position them above input */}
          {(isRateLimited || error) && (
            <div className="absolute bottom-full left-0 right-0 mb-2 px-4">
              {isRateLimited && (
                <div className="error-message bg-orange-600">
                  <Clock className="w-4 h-4 inline mr-2" />
                  Rate limited. Wait {rateLimitTime} seconds.
                </div>
              )}
              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}
            </div>
          )}
        </form>
    </div>
  );
}
