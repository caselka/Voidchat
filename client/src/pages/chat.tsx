import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useWebSocket } from "@/hooks/use-websocket";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import ChatContainer from "@/components/chat-container";
import MessageInput from "@/components/message-input";

import HumanVerification from "@/components/human-verification";
import Walkthrough from "@/components/walkthrough";
import DynamicHeader from "@/components/dynamic-header";
import RoomsSidebar from "@/components/rooms-sidebar";
import { Button } from "@/components/ui/button";
import { Moon, Sun, MoreVertical, Shield, Megaphone, Info, User, Palette, LogIn, LogOut, Users, Plus, MessageSquare, Mail } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import type { Room } from "@shared/schema";

export default function Chat() {
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { messages, isConnected, currentUser, onlineCount, sendMessage, muteUser, deleteMessage, enableSlowMode, error, rateLimitTime } = useWebSocket();
  const [profanityFilter, setProfanityFilter] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isHumanVerified, setIsHumanVerified] = useState(false);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: number; content: string; username: string } | null>(null);
  const [globalCooldown, setGlobalCooldown] = useState<{ active: boolean; timeLeft: number; reason: string } | null>(null);
  const [showRoomsSidebar, setShowRoomsSidebar] = useState(false);
  const [hasUserSentMessage, setHasUserSentMessage] = useState(false);

  // Fetch rooms for dropdown
  const { data: rooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ['/api/rooms'],
    enabled: true,
  });

  // Check if user is new (for walkthrough)
  useEffect(() => {
    if (!isAuthenticated) {
      const hasSeenWalkthrough = localStorage.getItem('voidchat-walkthrough-seen');
      if (!hasSeenWalkthrough) {
        setShowWalkthrough(true);
      }
    }
  }, [isAuthenticated]);

  const handleWalkthroughComplete = () => {
    setShowWalkthrough(false);
    localStorage.setItem('voidchat-walkthrough-seen', 'true');
  };

  const handleWalkthroughSkip = () => {
    setShowWalkthrough(false);
    localStorage.setItem('voidchat-walkthrough-seen', 'true');
  };

  const RoomsList = () => {
    if (roomsLoading) {
      return <DropdownMenuItem disabled>Loading rooms...</DropdownMenuItem>;
    }
    
    if (rooms.length === 0) {
      return <DropdownMenuItem disabled>No rooms available</DropdownMenuItem>;
    }
    
    return (
      <>
        {rooms.map((room: Room) => (
          <DropdownMenuItem key={room.id} asChild>
            <Link href={`/room/${room.name}`} className="flex items-center">
              <MessageSquare className="w-4 h-4 mr-2" />
              {room.name}
            </Link>
          </DropdownMenuItem>
        ))}
      </>
    );
  };

  // Check if user needs human verification (anonymous users only) - DISABLED FOR NOW
  const needsVerification = false; // !isAuthenticated && !isHumanVerified;

  useEffect(() => {
    // Track scroll position in the messages area for auto-scroll behavior
    const handleScroll = () => {
      const messagesArea = document.querySelector('.chat-messages-area');
      if (messagesArea) {
        const threshold = 100;
        const position = messagesArea.scrollTop + messagesArea.clientHeight;
        const height = messagesArea.scrollHeight;
        setIsAtBottom(position >= height - threshold);
      }
    };

    const messagesArea = document.querySelector('.chat-messages-area');
    if (messagesArea) {
      messagesArea.addEventListener('scroll', handleScroll);
      return () => messagesArea.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Load message history on page load
  useEffect(() => {
    const loadMessageHistory = async () => {
      try {
        const response = await fetch('/api/recent-messages');
        if (response.ok) {
          const historyMessages = await response.json();
          // Messages are managed by the WebSocket hook, not local state
          console.log('Message history loaded:', historyMessages.length, 'messages');
        }
      } catch (error) {
        console.error('Failed to load message history:', error);
      }
    };
    
    loadMessageHistory();
  }, []);

  useEffect(() => {
    // Auto-scroll when new messages arrive - optimized for new flexbox layout
    if (messages.length > 0) {
      setTimeout(() => {
        const messagesArea = document.querySelector('.chat-messages-area');
        if (messagesArea) {
          // Scroll the messages area container to bottom
          messagesArea.scrollTo({ 
            top: messagesArea.scrollHeight, 
            behavior: 'smooth' 
          });
        }
      }, 100);
    }
  }, [messages]);

  // Track when user sends their first message
  useEffect(() => {
    if (messages.length > 0 && currentUser && !hasUserSentMessage) {
      // Check if any message is from the current user
      const userHasSentMessage = messages.some(message => message.username === currentUser);
      if (userHasSentMessage) {
        setHasUserSentMessage(true);
      }
    }
  }, [messages, currentUser, hasUserSentMessage]);

  // Show connection status
  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-pulse text-muted-foreground">connecting to the void...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-layout chat-page-container font-sans bg-background text-foreground transition-colors duration-300">
      {/* Dynamic Header */}
      <div className="chat-header">
        <DynamicHeader 
          title={`voidchat · ${onlineCount} online`}
          showRooms={true}
          onRoomsClick={() => setShowRoomsSidebar(true)}
        />
      </div>
      {/* Main content with header offset */}
      <div className="main-content pt-0 pb-0">
        {/* Rooms Sidebar */}
        <RoomsSidebar 
          isOpen={showRoomsSidebar}
          onClose={() => setShowRoomsSidebar(false)}
        />
        
        {/* Human Verification Modal for Anonymous Users - DISABLED */}
        {/* {needsVerification && (
          <HumanVerification onVerified={() => setIsHumanVerified(true)} />
        )} */}
        
        {/* Main Chat Messages Area */}
        <div className="chat-messages-area overflow-y-auto touch-pan-y" style={{
          height: hasUserSentMessage ? 'calc(100vh - 6rem)' : 'calc(100vh - 8.75rem)',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          transition: 'height 1s ease-in-out'
        }}>
        {/* Welcome Section */}
        <div className={`max-w-4xl mx-auto px-4 transition-all duration-1000 ${hasUserSentMessage ? 'opacity-0 pointer-events-none h-0 overflow-hidden' : 'opacity-100'}`}>
          <div className="text-center py-2 md:py-3 space-y-4 pt-[3px] pb-[0px]">
            <div className="space-y-3">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                <h1 className="text-xl md:text-2xl font-light tracking-wide" style={{ color: 'var(--text)' }}>
                  voidchat
                </h1>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Anonymous real-time chat • Messages are impermanent
              </p>
            </div>
            
            {/* Enhanced status indicators */}
            <div className="flex justify-center items-center space-x-6 md:space-x-8">
              <div className="text-center">
                <div className="text-lg font-bold" style={{ color: 'var(--text)' }}>
                  {onlineCount}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  online
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold" style={{ color: 'var(--text)' }}>
                  {messages.length}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  messages
                </div>
              </div>
            </div>
            
            {currentUser && (
              <div className="you-are-tag">
                You are <span className="username">{currentUser}</span>
              </div>
            )}
          </div>
          
          {/* Status indicators */}
          <div className={`flex justify-center items-center mobile-status-buttons pt-[2px] pb-[2px] transition-opacity duration-1000 ${hasUserSentMessage ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            {/* Profanity Filter Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setProfanityFilter(!profanityFilter)}
              className="p-3 transition-colors rounded-lg min-h-11 min-w-11 pt-[5px] pb-[5px] pl-[0px] pr-[0px]"
              style={{
                backgroundColor: profanityFilter ? 'var(--bubble-other)' : 'transparent',
                color: profanityFilter ? 'var(--text)' : 'var(--text-muted)'
              }}
              title="Toggle profanity filter"
            >
              <span className="text-sm">{profanityFilter ? '***' : '@#!'}</span>
            </Button>
            
            {/* Rate Limit Indicator */}
            {rateLimitTime > 0 && (
              <div className="flex items-center space-x-2 px-4 py-2 rounded-xl" style={{ 
                backgroundColor: 'var(--bubble-other)',
                border: '1px solid var(--border-subtle)'
              }}>
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Cooldown: {rateLimitTime}s
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Chat Messages Container */}
        <div className="message-container">
          <ChatContainer 
            messages={messages}
            isGuardian={user?.isGuardian || false}
            onMuteUser={muteUser}
            onDeleteMessage={deleteMessage}
            onReplyToMessage={(message) => setReplyingTo(message)}
            profanityFilter={profanityFilter}
            currentUser={currentUser}
          />
        </div>
        </div>

        {/* Message Input - Now handled by fixed positioning in MessageInput component */}
        <MessageInput 
          onSendMessage={sendMessage}
          rateLimitTime={rateLimitTime}
          error={error}
        />
      </div>
      {/* Walkthrough */}
      <Walkthrough
        isVisible={showWalkthrough}
        onComplete={handleWalkthroughComplete}
        onSkip={handleWalkthroughSkip}
      />
    </div>
  );
}
