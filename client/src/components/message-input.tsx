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
    <>
      <input
        ref={textareaRef}
        type="text"
        value={messageText}
        onChange={(e) => {
          const value = e.target.value;
          const cleanValue = value.replace(/<[^>]*>/g, '').replace(/\{[^}]*\}/g, '');
          setMessageText(cleanValue);
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
              messagesArea.scrollTop = messagesArea.scrollHeight;
            }
          }, 100);
        }}
        placeholder={isRateLimited ? `Wait ${rateLimitTime}s...` : "Type a message…"}
        disabled={isRateLimited}
        autoComplete="off"
        maxLength={maxLength}
        style={{
          flex: 1,
          padding: 'var(--spacing-sm) var(--spacing-md)',
          fontSize: 'var(--font-base)',
          borderRadius: 'var(--radius)',
          border: 'none',
          background: 'var(--input-bg)',
          color: 'var(--text)',
          outline: 'none'
        }}
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSend}
        style={{
          fontSize: 'var(--font-lg)',
          padding: 'var(--spacing-sm) var(--spacing-md)',
          background: 'var(--button-bg)',
          color: 'white',
          borderRadius: 'var(--radius)',
          border: 'none',
          cursor: canSend ? 'pointer' : 'not-allowed'
        }}
      >
        {isRateLimited ? '⏱' : '➤'}
      </button>
      
      {/* Error Messages */}
      {(error || isRateLimited) && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: 0,
          right: 0,
          padding: '0.5rem 1rem',
          backgroundColor: 'rgba(255, 0, 0, 0.1)',
          color: '#ff6b6b',
          fontSize: '0.875rem',
          borderRadius: '0.5rem 0.5rem 0 0'
        }}>
          {error || `Wait ${rateLimitTime} seconds before sending another message`}
        </div>
      )}
    </>
  );
}
