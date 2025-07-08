import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useWebSocket } from "@/hooks/use-websocket";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import HumanVerification from "@/components/human-verification";
import Walkthrough from "@/components/walkthrough";
import { Send, MoreVertical, Shield, User, LogIn, LogOut, Palette, Megaphone, Info } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function VoidchatLayout() {
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { 
    messages, 
    isConnected, 
    isGuardian, 
    onlineCount, 
    sendMessage, 
    muteUser, 
    deleteMessage, 
    error, 
    rateLimitTime 
  } = useWebSocket();

  const [messageText, setMessageText] = useState('');
  const [profanityFilter, setProfanityFilter] = useState(false);
  const [isHumanVerified, setIsHumanVerified] = useState(false);
  const [showWalkthrough, setShowWalkthrough] = useState(false);

  const maxLength = 500;
  const isRateLimited = rateLimitTime > 0;
  const canSend = messageText.trim().length > 0 && !isRateLimited;
  const needsVerification = !isAuthenticated && !isHumanVerified;

  // Check if user is new (for walkthrough)
  useEffect(() => {
    if (!isAuthenticated) {
      const hasSeenWalkthrough = localStorage.getItem('voidchat-walkthrough-seen');
      if (!hasSeenWalkthrough) {
        setShowWalkthrough(true);
      }
    }
  }, [isAuthenticated]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      const container = document.querySelector('.messages-container');
      if (container) {
        setTimeout(() => {
          container.scrollTop = container.scrollHeight;
        }, 100);
      }
    }
  }, [messages]);

  const handleWalkthroughComplete = () => {
    setShowWalkthrough(false);
    localStorage.setItem('voidchat-walkthrough-seen', 'true');
  };

  const handleWalkthroughSkip = () => {
    setShowWalkthrough(false);
    localStorage.setItem('voidchat-walkthrough-seen', 'true');
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSend) {
      sendMessage(messageText.trim());
      setMessageText('');
      
      // Auto-resize textarea
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
    // Simple profanity filter - replace with ### of same length
    const badWords = ['fuck', 'shit', 'damn', 'hell', 'bitch', 'ass', 'bastard'];
    let filtered = text;
    badWords.forEach(word => {
      const regex = new RegExp(word, 'gi');
      filtered = filtered.replace(regex, '#'.repeat(word.length));
    });
    return filtered;
  };

  if (showWalkthrough) {
    return (
      <Walkthrough
        isVisible={showWalkthrough}
        onComplete={handleWalkthroughComplete}
        onSkip={handleWalkthroughSkip}
      />
    );
  }

  if (needsVerification) {
    return (
      <div className="modal-overlay">
        <HumanVerification onVerified={() => setIsHumanVerified(true)} />
      </div>
    );
  }

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
          {isGuardian && (
            <div className="header-button" style={{ background: 'rgba(0, 255, 136, 0.1)', borderColor: '#00ff88' }}>
              <Shield size={14} />
              Guardian
            </div>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="header-button">
                <MoreVertical size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="dropdown-menu" align="end">
              <div className="dropdown-item" onClick={toggleTheme}>
                <Palette size={16} />
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </div>
              <div className="dropdown-item" onClick={() => setProfanityFilter(!profanityFilter)}>
                <Megaphone size={16} />
                Profanity Filter: {profanityFilter ? 'ON' : 'OFF'}
              </div>
              <div className="dropdown-separator"></div>
              {!isLoading && (
                <>
                  {isAuthenticated ? (
                    <>
                      <Link href="/member-settings">
                        <div className="dropdown-item">
                          <User size={16} />
                          Account Settings
                        </div>
                      </Link>
                      <Link href="/api/logout">
                        <div className="dropdown-item">
                          <LogOut size={16} />
                          Sign Out
                        </div>
                      </Link>
                    </>
                  ) : (
                    <Link href="/api/login">
                      <div className="dropdown-item">
                        <LogIn size={16} />
                        Sign In
                      </div>
                    </Link>
                  )}
                </>
              )}
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

      {/* Messages Container */}
      <main className="messages-container">
        <div className="messages-list">
          {messages.length === 0 ? (
            <div className="empty-state">
              <h3>Welcome to the void</h3>
              <p>Start a conversation by typing below</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div key={message.id || `message-${index}`} className="message-bubble">
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
                    {formatTime(message.createdAt || message.timestamp)}
                  </span>
                </div>
                <div className="message-content">
                  {filterProfanity(message.content)}
                </div>
                {(message.type === 'ad' || message.isAd) && message.url && (
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #333' }}>
                    <a 
                      href={message.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: '#00ff88', fontSize: '12px', textDecoration: 'none' }}
                    >
                      Learn more →
                    </a>
                  </div>
                )}
                {isGuardian && message.username !== 'system' && message.username !== 'System' && !message.isAd && message.type !== 'ad' && (
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #333', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button 
                      onClick={() => muteUser(message.id)}
                      style={{ 
                        background: 'rgba(255, 68, 68, 0.1)', 
                        border: '1px solid #ff4444', 
                        color: '#ff6b6b', 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        fontSize: '11px',
                        cursor: 'pointer'
                      }}
                    >
                      Mute
                    </button>
                    <button 
                      onClick={() => deleteMessage(message.id)}
                      style={{ 
                        background: 'rgba(255, 68, 68, 0.1)', 
                        border: '1px solid #ff4444', 
                        color: '#ff6b6b', 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        fontSize: '11px',
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}
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