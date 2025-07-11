import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, Users, Crown, Settings, Shield, Volume, Trash2, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-room-websocket";
import ChatContainer from "@/components/chat-container";
import MessageInput from "@/components/message-input";
import DynamicHeader from "@/components/dynamic-header";
import RoomsSidebar from "@/components/rooms-sidebar";
import { Loader2 } from "lucide-react";

interface Room {
  id: number;
  name: string;
  creatorId: string;
  createdAt: string;
  isActive: boolean;
}

interface RoomMessage {
  id: number;
  content: string;
  username: string;
  ipAddress: string;
  createdAt: string;
  expiresAt: string;
  roomId: number;
}

export default function Room() {
  const { name } = useParams();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [showSettings, setShowSettings] = useState(false);
  const [showRoomsSidebar, setShowRoomsSidebar] = useState(false);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [rateLimitTime, setRateLimitTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const { data: roomData, isLoading, error: roomError } = useQuery({
    queryKey: [`/api/rooms/${name}`],
    enabled: !!name,
  });

  const { data: roomMessages, isLoading: messagesLoading } = useQuery({
    queryKey: [`/api/rooms/${name}/messages`],
    enabled: !!name && !!roomData?.room,
  });

  const room: Room | undefined = roomData?.room;
  
  // Initialize WebSocket connection for room-specific messages
  const { isConnected } = useWebSocket(`/ws/room/${name}`, {
    onMessage: (data) => {
      if (data.type === 'room_message') {
        setMessages(prev => [...prev, data.data]);
      } else if (data.type === 'initial_room_messages') {
        setMessages(data.data.reverse()); // Reverse to show oldest first
      } else if (data.type === 'rate_limit') {
        setRateLimitTime(data.data.resetTime - Date.now());
      } else if (data.type === 'error') {
        setError(data.data.message);
        setTimeout(() => setError(null), 5000);
      } else if (data.type === 'room_message_deleted') {
        setMessages(prev => prev.filter(msg => msg.id !== data.data.messageId));
      }
    },
    onConnect: () => {
      setError(null);
    },
    onDisconnect: () => {
      setError("Connection lost. Reconnecting...");
    }
  });

  // Load initial messages
  useEffect(() => {
    if (roomMessages && Array.isArray(roomMessages)) {
      setMessages(roomMessages);
    }
  }, [roomMessages]);

  const sendMessage = async (content: string) => {
    if (!room) return;
    
    try {
      await apiRequest("POST", `/api/rooms/${name}/messages`, {
        content: content.trim(),
        roomId: room.id
      });
      setError(null);
    } catch (err: any) {
      console.error('Error sending message:', err);
      const errorMessage = err.message || 'Failed to send message';
      setError(errorMessage);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleMuteUser = async (messageId: string | number) => {
    if (!room || !canModerate) return;
    
    try {
      await apiRequest("POST", `/api/rooms/${name}/mute`, { messageId });
      toast({
        title: "User Muted",
        description: "User has been muted in this room for 5 minutes.",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to mute user",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMessage = async (messageId: string | number) => {
    if (!room || !canModerate) return;
    
    try {
      await apiRequest("DELETE", `/api/rooms/${name}/messages/${messageId}`);
      toast({
        title: "Message Deleted",
        description: "Message has been removed.",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete message",
        variant: "destructive",
      });
    }
  };

  if (isLoading || messagesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center matrix-bg">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-sm text-muted-foreground hacker-typewriter">Entering room...</p>
        </div>
      </div>
    );
  }

  if (roomError || !room) {
    return (
      <div className="min-h-screen bg-background text-foreground p-4">
        <div className="max-w-2xl mx-auto pt-20">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Room Not Found</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                The room "/{name}" doesn't exist or has been deactivated.
              </p>
              <div className="flex space-x-2">
                <Button onClick={() => setLocation("/chat")} className="flex-1">
                  <Home className="w-4 h-4 mr-2" />
                  Back to Global Chat
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setLocation("/create-room")} 
                  className="flex-1"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Create Room
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isOwner = isAuthenticated && user?.id === room.creatorId;
  const isSuperUser = user?.username === 'caselka'; // Super user has moderation powers everywhere
  const canModerate = isOwner || isSuperUser;

  return (
    <div className="chat-layout bg-background text-foreground">
      {/* Dynamic Header */}
      <div className="chat-header">
        <DynamicHeader 
          title={`/${room.name}`}
          showBack={true}
          backUrl="/chat"
          showHome={true}
          showRooms={true}
          onRoomsClick={() => setShowRoomsSidebar(true)}
        />
      </div>
      
      {/* Rooms Sidebar */}
      <RoomsSidebar 
        isOpen={showRoomsSidebar}
        onClose={() => setShowRoomsSidebar(false)}
      />
      
      {/* Main Chat Messages Area */}
      <div className="chat-messages-area">
        <div className="max-w-6xl mx-auto px-2">
        {/* Room Header */}
        <div className="border-b p-4 mb-4" style={{ 
          backgroundColor: 'var(--bubble-other)', 
          borderColor: 'var(--border-subtle)' 
        }}>
          <div className="flex flex-col md:flex-row md:items-center justify-between space-y-3 md:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-lg md:text-xl font-semibold" style={{ color: 'var(--text)' }}>
                    /{room.name}
                  </h1>
                  {isOwner && (
                    <div className="p-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                      <Crown className="w-4 h-4 text-yellow-600 dark:text-yellow-400" title="You own this room" />
                    </div>
                  )}
                  {isSuperUser && !isOwner && (
                    <div className="p-1 rounded-full bg-blue-100 dark:bg-blue-900/30">
                      <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" title="Super User - Universal Moderation" />
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>{isConnected ? '🟢 Connected' : '🟡 Connecting...'}</span>
                  <span>• Created {new Date(room.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            
            {canModerate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className="h-9 w-9 rounded-lg"
                style={{ color: 'var(--text-muted)' }}
              >
                <Settings className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Room Settings Panel */}
        {canModerate && showSettings && (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-4 h-4" />
                <span>Room Moderation</span>
              </CardTitle>
              <CardDescription>
                {isOwner 
                  ? "You have full moderation powers as the room owner" 
                  : "You have moderation powers as a super user"
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-400">
                  <Crown className="w-4 h-4 inline mr-1" />
                  <strong>Owner Powers:</strong> Delete any message, mute users, control room settings
                </p>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• Hover over messages to see moderation controls</p>
                <p>• Users can be muted for 5 minutes per action</p>
                <p>• All moderation actions are logged</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chat Container */}
        <div className="relative">
          <ChatContainer
            messages={messages.map(msg => ({
              id: msg.id,
              content: msg.content,
              username: msg.username,
              timestamp: msg.createdAt,
              expiresAt: msg.expiresAt,
              ipAddress: msg.ipAddress,
            }))}
            isGuardian={canModerate}
            onMuteUser={handleMuteUser}
            onDeleteMessage={handleDeleteMessage}
            onReplyToMessage={() => {}} // Rooms don't support replies yet
            profanityFilter={false}
            currentUser={user?.username}
          />
        </div>
        </div>
      </div>

      {/* Message Input - Now handled by fixed positioning in MessageInput component */}
      <MessageInput
        onSendMessage={sendMessage}
        rateLimitTime={rateLimitTime}
        error={error}
      />
    </div>
  );
}