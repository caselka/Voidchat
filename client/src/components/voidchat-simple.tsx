/**
 * Voidchat Simple Layout Component
 * 
 * Clean, mobile-first chat interface with:
 * - Message filtering (only valid messages)
 * - Auto-scroll to latest messages
 * - Mobile keyboard handling
 * - Flexbox column layout
 */

import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Send, MoreVertical, Shield, User, LogIn, LogOut, Palette, Megaphone, Info } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Basic message interface
interface SimpleMessage {
  id: string | number;
  content: string;
  username: string;
  timestamp?: string;
  createdAt?: string;
  isAd?: boolean;
  type?: string;
  isGuardian?: boolean;
}

export default function VoidchatSimple() {
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<SimpleMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitTime, setRateLimitTime] = useState(0);
  const [profanityFilter, setProfanityFilter] = useState(false);

  const maxLength = 500;
  const isRateLimited = rateLimitTime > 0;
  const canSend = messageText.trim().length > 0 && !isRateLimited;

  // WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log('Connecting to WebSocket:', wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected successfully');
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'recent_messages' && Array.isArray(data.messages)) {
          setMessages(data.messages);
        } else if (data.type === 'new_message' && data.message) {
          setMessages(prev => [...prev, data.message]);
        } else if (data.type === 'online_count') {
          setOnlineCount(data.count || 0);
        } else if (data.type === 'error') {
          setError(data.message);
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('WebSocket disconnected');
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      setError('Connection error');
    };

    return () => {
      ws.close();
    };
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const container = document.querySelector('.messages-container');
    if (container) {
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  }, [messages.length]);

  // Filter out invalid messages
  const validMessages = messages.filter(message => 
    message && 
    message.content && 
    typeof message.content === 'string' && 
    message.content.trim().length > 0 &&
    message.username &&
    typeof message.username === 'string' &&
    message.username.trim().length > 0
  );

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSend) {
      // Simple message sending (WebSocket integration would go here)
      const newMessage: SimpleMessage = {
        id: Date.now(),
        content: messageText.trim(),
        username: 'anon' + Math.floor(Math.random() * 9999).toString().padStart(4, '0'),
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, newMessage]);
      setMessageText('');
      
      // Reset textarea height
      const textarea = document.querySelector('.message-input') as HTMLTextAreaElement;
      if (textarea) {
        textarea.style.height = 'auto';
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setMessageText(value);
      
      // Auto-resize textarea
      const textarea = e.target;
      textarea.style.height = 'auto';
      const scrollHeight = Math.min(textarea.scrollHeight, 120);
      textarea.style.height = `${Math.max(48, scrollHeight)}px`;
    }
  };

  const formatTime = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const filterProfanity = (text: string) => {
    if (!profanityFilter) return text;
    const badWords = ['fuck', 'shit', 'damn', 'hell', 'bitch', 'ass', 'bastard'];
    let filtered = text;
    badWords.forEach(word => {
      const regex = new RegExp(word, 'gi');
      filtered = filtered.replace(regex, '#'.repeat(word.length));
    });
    return filtered;
  };

  return (
    <div className="voidchat-container">
      {/* Header */}
      <header className="voidchat-header">
        <div className="connection-status">
          <div className={`status-dot ${!isConnected ? 'disconnected' : ''}`}></div>
          <span>{isConnected ? 'connected' : 'connecting...'}</span>
          {onlineCount > 0 && <span>• {onlineCount} online</span>}
        </div>
        
        <h1 className="voidchat-title">voidchat</h1>
        
        <div className="header-controls">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="header-button">
                <MoreVertical size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="dropdown-menu" align="end">
              <div className="dropdown-item" onClick={() => setProfanityFilter(!profanityFilter)}>
                <Megaphone size={16} />
                Profanity Filter: {profanityFilter ? 'ON' : 'OFF'}
              </div>
              <div className="dropdown-separator"></div>
              <Link href="/api/login">
                <div className="dropdown-item">
                  <LogIn size={16} />
                  Sign In
                </div>
              </Link>
              <div className="dropdown-separator"></div>
              <Link href="/guardian">
                <div className="dropdown-item">
                  <Shield size={16} />
                  Guardian ($20/day)
                </div>
              </Link>
              <Link href="/handle">
                <div className="dropdown-item">
                  <User size={16} />
                  Custom Handle ($3)
                </div>
              </Link>
              <Link href="/themes">
                <div className="dropdown-item">
                  <Palette size={16} />
                  Custom Themes ($5)
                </div>
              </Link>
              <Link href="/sponsor">
                <div className="dropdown-item">
                  <Megaphone size={16} />
                  Sponsor Ads
                </div>
              </Link>
              <div className="dropdown-separator"></div>
              <Link href="/about">
                <div className="dropdown-item">
                  <Info size={16} />
                  About
                </div>
              </Link>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Messages Container - Flexbox layout for chat feed */}
      <main className="messages-container">
        <div className="messages-list">
          {validMessages.length === 0 ? (
            <div className="empty-state">
              <h3>Welcome to the void</h3>
              <p>Start a conversation by typing below</p>
            </div>
          ) : (
            validMessages.map((message, index) => (
              <div key={message.id || `message-${index}`} className="message-bubble">
                {/* Message header with username and timestamp */}
                <div className="message-header">
                  <span 
                    className={`message-username ${
                      message.type === 'ad' || message.isAd ? 'sponsor' :
                      message.username === 'system' || message.username === 'System' ? 'system' : ''
                    }`}
                  >
                    {message.username}
                    {(message.type === 'ad' || message.isAd) && ' (sponsor)'}
                    {message.isGuardian && (
                      <Shield size={12} style={{ display: 'inline', marginLeft: '4px', color: '#00ff88' }} />
                    )}
                  </span>
                  <span className="message-time">
                    {formatTime(message.createdAt || message.timestamp || '')}
                  </span>
                </div>
                
                {/* Message content with proper padding */}
                <div className="message-content">
                  {filterProfanity(message.content)}
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Input Container */}
      <div className="input-container">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        {isRateLimited && (
          <div className="rate-limit-message">
            Rate limited. Wait {rateLimitTime} seconds before sending another message.
          </div>
        )}
        
        <form onSubmit={handleSendMessage} className="input-wrapper">
          <div style={{ flex: 1, position: 'relative' }}>
            <textarea
              value={messageText}
              onChange={handleInputChange}
              placeholder="Type a message..."
              className="message-input"
              disabled={isRateLimited}
              style={{ fontSize: '16px' }} // Prevent zoom on iOS
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />
            <div className="char-counter">
              {messageText.length}/{maxLength}
            </div>
          </div>
          
          <button
            type="submit"
            disabled={!canSend}
            className="send-button"
          >
            <Send className="send-icon" />
          </button>
        </form>
      </div>
    </div>
  );
}