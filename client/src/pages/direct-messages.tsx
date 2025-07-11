import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, Trash2, Users, Loader2, Plus, Search, ChevronLeft, Clock, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import DynamicHeader from '@/components/dynamic-header';
import { formatDistanceToNow } from 'date-fns';

interface DirectMessage {
  id: number;
  fromUserId: string;
  toUserId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

interface Conversation {
  id: number;
  user1Id: string;
  user2Id: string;
  lastMessageAt: string;
  user1UnreadCount: number;
  user2UnreadCount: number;
  otherUser: {
    id: string;
    username: string;
    email: string;
  };
}

export default function DirectMessagesPage() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [newRecipient, setNewRecipient] = useState('');
  const [showNewMessage, setShowNewMessage] = useState(false);

  // Fetch conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ['/api/conversations'],
    enabled: isAuthenticated,
  });

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['/api/direct-messages', selectedConversation?.otherUser.id],
    enabled: !!selectedConversation,
  });

  // Fetch unread count
  const { data: unreadData } = useQuery({
    queryKey: ['/api/unread-count'],
    enabled: isAuthenticated,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { toUserId: string; content: string }) => {
      return await apiRequest('POST', '/api/direct-messages', data);
    },
    onSuccess: () => {
      setNewMessage('');
      setNewRecipient('');
      setShowNewMessage(false);
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/direct-messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/unread-count'] });
      toast({ title: 'Message sent successfully' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to send message',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (conversationId: number) => {
      return await apiRequest('POST', `/api/conversations/${conversationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/unread-count'] });
    },
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return await apiRequest('DELETE', `/api/direct-messages/${messageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/direct-messages'] });
      toast({ title: 'Message deleted successfully' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete message',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Handle conversation selection
  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    const unreadCount = conversation.user1Id === user?.id ? 
      conversation.user1UnreadCount : conversation.user2UnreadCount;
    if (unreadCount > 0) {
      markAsReadMutation.mutate(conversation.id);
    }
  };

  // Handle send message
  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    let recipientId: string;
    if (selectedConversation) {
      recipientId = selectedConversation.otherUser.id;
    } else if (newRecipient.trim()) {
      recipientId = newRecipient.trim();
    } else {
      toast({
        title: 'Error',
        description: 'Please select a conversation or enter a recipient',
        variant: 'destructive',
      });
      return;
    }

    sendMessageMutation.mutate({
      toUserId: recipientId,
      content: newMessage,
    });
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check mobile screen size
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-refresh conversations and messages
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/unread-count'] });
      if (selectedConversation) {
        queryClient.invalidateQueries({ queryKey: ['/api/direct-messages'] });
      }
    }, 3000); // Refresh every 3 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated, selectedConversation, queryClient]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <DynamicHeader title="Direct Messages" showBack={true} backUrl="/chat" />
        <div className="pt-16 flex items-center justify-center min-h-screen">
          <Card className="w-96 mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-6 w-6" />
                Direct Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Direct messaging is only available for paid account users.
              </p>
              <Button onClick={() => window.location.href = '/login'} className="w-full">
                Login to Access Direct Messages
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DynamicHeader 
        title={selectedConversation && isMobile ? selectedConversation.otherUser.username : "Direct Messages"} 
        showBack={selectedConversation && isMobile ? true : true} 
        backUrl={selectedConversation && isMobile ? "/messages" : "/chat"}
      />
      
      <div className="pt-16 h-screen flex flex-col">
        {/* Mobile: Show conversation list or messages */}
        {isMobile ? (
          <>
            {!selectedConversation ? (
              /* Conversation List - Mobile */
              <div className="flex-1 overflow-hidden">
                <div className="p-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-6 w-6" />
                      <h1 className="text-xl font-semibold">Messages</h1>
                      {unreadData?.count > 0 && (
                        <Badge variant="destructive">{unreadData.count}</Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setShowNewMessage(true)}
                      className="bg-primary"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <ScrollArea className="flex-1">
                  <div className="p-4">
                    {conversationsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin button-icon" />
                      </div>
                    ) : conversations.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground mb-4">No conversations yet</p>
                        <Button onClick={() => setShowNewMessage(true)}>
                          Start Your First Message
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {conversations.map((conversation: Conversation) => {
                          const unreadCount = conversation.user1Id === user?.id ? 
                            conversation.user1UnreadCount : conversation.user2UnreadCount;
                          return (
                            <div
                              key={conversation.id}
                              className="p-4 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => handleConversationSelect(conversation)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium">{conversation.otherUser.username}</p>
                                    {unreadCount > 0 && (
                                      <Badge variant="destructive" className="text-xs">
                                        {unreadCount}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: true })}
                                  </p>
                                </div>
                                <ChevronLeft className="h-4 w-4 text-muted-foreground rotate-180" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              /* Messages View - Mobile */
              <div className="flex-1 flex flex-col">
                <ScrollArea className="flex-1 p-4">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message: DirectMessage) => (
                        <div
                          key={message.id}
                          className={`flex ${message.fromUserId === user?.id ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] p-3 rounded-lg ${
                              message.fromUserId === user?.id
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>
                
                {/* Message Input - Mobile */}
                <div className="p-4 border-t border-border">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleSendMessage}
                      disabled={sendMessageMutation.isPending || !newMessage.trim()}
                      size="sm"
                    >
                      {sendMessageMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Desktop Layout */
          <div className="flex-1 flex">
            {/* Conversations Sidebar - Desktop */}
            <div className="w-80 border-r border-border bg-muted/20">
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    <h2 className="font-semibold">Messages</h2>
                    {unreadData?.count > 0 && (
                      <Badge variant="destructive">{unreadData.count}</Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setShowNewMessage(true)}
                    className="bg-primary"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <ScrollArea className="h-full">
                <div className="p-2">
                  {conversationsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="text-center py-8 px-4">
                      <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground text-sm mb-4">No conversations yet</p>
                      <Button onClick={() => setShowNewMessage(true)} size="sm">
                        Start Messaging
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {conversations.map((conversation: Conversation) => {
                        const unreadCount = conversation.user1Id === user?.id ? 
                          conversation.user1UnreadCount : conversation.user2UnreadCount;
                        return (
                          <div
                            key={conversation.id}
                            className={`p-3 rounded-lg cursor-pointer transition-colors ${
                              selectedConversation?.id === conversation.id
                                ? 'bg-primary text-primary-foreground'
                                : 'hover:bg-muted'
                            }`}
                            onClick={() => handleConversationSelect(conversation)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium truncate">{conversation.otherUser.username}</p>
                                  {unreadCount > 0 && (
                                    <Badge 
                                      variant={selectedConversation?.id === conversation.id ? "secondary" : "destructive"}
                                      className="text-xs"
                                    >
                                      {unreadCount}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm opacity-70 truncate">
                                  {formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: true })}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
            
            {/* Messages Area - Desktop */}
            <div className="flex-1 flex flex-col">
              {selectedConversation ? (
                <>
                  <div className="p-4 border-b border-border">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4" />
                      </div>
                      <h3 className="font-semibold">{selectedConversation.otherUser.username}</h3>
                    </div>
                  </div>
                  
                  <ScrollArea className="flex-1 p-4">
                    {messagesLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="font-semibold mb-2">Start your conversation</h3>
                        <p className="text-muted-foreground">Send a message to {selectedConversation.otherUser.username}</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((message: DirectMessage) => (
                          <div
                            key={message.id}
                            className={`flex ${message.fromUserId === user?.id ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[70%] p-3 rounded-lg ${
                                message.fromUserId === user?.id
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              <p>{message.content}</p>
                              <p className="text-xs opacity-70 mt-1">
                                {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>
                  
                  <div className="p-4 border-t border-border">
                    <div className="flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={`Message ${selectedConversation.otherUser.username}...`}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        className="flex-1"
                      />
                      <Button 
                        onClick={handleSendMessage}
                        disabled={sendMessageMutation.isPending || !newMessage.trim()}
                      >
                        {sendMessageMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
                    <p className="text-muted-foreground mb-4">Choose a conversation from the sidebar to start messaging</p>
                    <Button onClick={() => setShowNewMessage(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      New Message
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* New Message Modal */}
      {showNewMessage && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>New Message</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowNewMessage(false)}>
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">To:</label>
                <Input
                  value={newRecipient}
                  onChange={(e) => setNewRecipient(e.target.value)}
                  placeholder="Enter username"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Message:</label>
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="mt-1"
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleSendMessage}
                  disabled={sendMessageMutation.isPending || !newMessage.trim() || !newRecipient.trim()}
                  className="flex-1"
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5 mr-2 button-icon" />
                  )}
                  Send Message
                </Button>
                <Button variant="outline" onClick={() => setShowNewMessage(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}