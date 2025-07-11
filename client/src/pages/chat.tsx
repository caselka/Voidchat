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

  useEffect(() => {
    // Auto-scroll when new messages arrive
    if (messages.length > 0) {
      setTimeout(() => {
        const messagesArea = document.querySelector('.chat-messages-area');
        if (messagesArea) {
          messagesArea.scrollTop = messagesArea.scrollHeight;
        }
      }, 50);
    }
  }, [messages]);

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
    <div className="chat-layout font-sans bg-background text-foreground transition-colors duration-300">
      {/* Dynamic Header */}
      <div className="chat-header">
        <DynamicHeader 
          title={`voidchat · ${onlineCount} online`}
          showRooms={true}
          onRoomsClick={() => setShowRoomsSidebar(true)}
        />
      </div>
      
      {/* Rooms Sidebar */}
      <RoomsSidebar 
        isOpen={showRoomsSidebar}
        onClose={() => setShowRoomsSidebar(false)}
      />
      
      {/* Human Verification Modal for Anonymous Users - DISABLED */}
      {/* {needsVerification && (
        <HumanVerification onVerified={() => setIsHumanVerified(true)} />
      )} */}
      
      {/* Replit-Style Header */}
      <header className="chat-header">
        <h1 style={{ color: 'var(--text)' }}>Voidchat</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)', margin: 0 }}>
          Welcome to the void. Messages are permanent.
          {currentUser && (
            <>
              <br />You are <span style={{ color: 'var(--text)' }}>{currentUser}</span>
            </>
          )}
        </p>
        
        {/* Status indicators */}
        <div className="flex justify-center items-center" style={{ gap: 'var(--spacing-md)', marginTop: 'var(--spacing-sm)' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setProfanityFilter(!profanityFilter)}
            className="p-2 transition-colors rounded-lg"
            style={{
              backgroundColor: profanityFilter ? 'var(--bubble-bg)' : 'transparent',
              color: profanityFilter ? 'var(--text)' : 'var(--text-muted)'
            }}
            title="Toggle profanity filter"
          >
            <span className="text-sm">{profanityFilter ? '***' : '@#$'}</span>
          </Button>
          
          {rateLimitTime > 0 && (
            <div style={{ 
              color: 'var(--text-muted)',
              backgroundColor: 'var(--bubble-bg)',
              padding: 'var(--spacing-xs) var(--spacing-sm)',
              borderRadius: 'var(--radius)',
              fontSize: 'var(--font-sm)'
            }}>
              Cooldown: {rateLimitTime}s
            </div>
          )}
        </div>
      </header>

      {/* Chat Messages Area */}
      <div className="chat-messages-area" id="messages">
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

      {/* Message Input - Sticky at bottom */}
      <div className="chat-input-area">
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
