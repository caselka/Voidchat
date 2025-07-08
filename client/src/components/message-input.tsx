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
            containerRef.current.style.transform = `translateY(-${keyboardHeight}px)`;
            containerRef.current.style.bottom = '0px';
          }
        } else {
          // Restore normal positioning
          document.body.classList.remove('ios-keyboard-open');
          if (containerRef.current) {
            containerRef.current.style.transform = '';
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
        transform: isKeyboardOpen ? 'translateZ(0)' : undefined,
        position: 'fixed',
        zIndex: 1000
      }}
    >
      <div className="max-w-4xl mx-auto px-3 md:px-4 py-3 md:py-4">

        <form onSubmit={handleSubmit} className="w-full">
          <div className="relative flex items-end bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm hover:border-gray-400 dark:hover:border-gray-500 focus-within:border-blue-500 dark:focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-500 dark:focus-within:ring-blue-400 transition-all duration-200">
            <div className="flex-1 min-h-[44px] max-h-[120px] overflow-hidden">
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
                  // Enhanced focus handling for mobile keyboards
                  setIsKeyboardOpen(true);
                  if (window.innerWidth <= 768) {
                    // Lock scroll position and prevent drift
                    document.body.style.position = 'fixed';
                    document.body.style.top = `-${window.scrollY}px`;
                    document.body.style.width = '100%';
                  }
                }}
                onBlur={() => {
                  // Restore scroll position when keyboard closes
                  setTimeout(() => {
                    setIsKeyboardOpen(false);
                    document.body.classList.remove('ios-keyboard-open');
                    if (window.innerWidth <= 768) {
                      const scrollY = document.body.style.top;
                      document.body.style.position = '';
                      document.body.style.top = '';
                      document.body.style.width = '';
                      window.scrollTo(0, parseInt(scrollY || '0') * -1);
                    }
                  }, 100);
                }}
                placeholder="Type a message..."
                className="message-input w-full resize-none border-none outline-none bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 text-[16px] leading-6 px-4 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
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
            </div>
            
            <div className="flex items-center gap-2 pr-2 pb-2">
              <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                {messageText.length}/{maxLength}
              </span>
              <Button
                type="submit"
                disabled={!canSend}
                size="sm"
                className="h-8 w-8 p-0 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 dark:disabled:bg-gray-700 text-white disabled:text-gray-400 dark:disabled:text-gray-500 rounded-lg shrink-0 transition-colors duration-200"
              >
                <Send className="w-4 h-4" />
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
