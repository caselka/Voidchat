import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MessageCircle, Send, Trash2, Users, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Card className="w-96">
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
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto p-4">
        <div className="flex items-center gap-4 mb-6">
          <MessageCircle className="h-8 w-8" />
          <h1 className="text-2xl font-bold">Direct Messages</h1>
          {unreadData?.count > 0 && (
            <Badge variant="destructive">{unreadData.count} unread</Badge>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversations List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Conversations
                </CardTitle>
                <Button
                  size="sm"
                  onClick={() => setShowNewMessage(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  New Message
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {conversationsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : conversations.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No conversations yet. Start a new message!
                </p>
              ) : (
                <div className="space-y-2">
                  {conversations.map((conversation: Conversation) => {
                    const unreadCount = conversation.user1Id === user?.id ? 
                      conversation.user1UnreadCount : conversation.user2UnreadCount;
                    return (
                      <div
                        key={conversation.id}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedConversation?.id === conversation.id
                            ? 'bg-blue-600'
                            : 'bg-gray-800 hover:bg-gray-700'
                        }`}
                        onClick={() => handleConversationSelect(conversation)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{conversation.otherUser.username}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(conversation.lastMessageAt).toLocaleString()}
                            </p>
                          </div>
                          {unreadCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Messages Area */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>
                {selectedConversation ? 
                  `Chat with ${selectedConversation.otherUser.username}` : 
                  showNewMessage ? 'New Message' : 'Select a conversation'
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* New Message Form */}
              {showNewMessage && (
                <div className="mb-4">
                  <Input
                    placeholder="Recipient username or user ID..."
                    value={newRecipient}
                    onChange={(e) => setNewRecipient(e.target.value)}
                    className="mb-2"
                  />
                  <Button
                    onClick={() => setShowNewMessage(false)}
                    variant="outline"
                    size="sm"
                    className="ml-2"
                  >
                    Cancel
                  </Button>
                </div>
              )}

              {/* Messages Display */}
              {selectedConversation && (
                <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No messages yet. Start the conversation!
                    </p>
                  ) : (
                    messages.map((message: DirectMessage) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.fromUserId === user?.id ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.fromUserId === user?.id
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-800 text-gray-200'
                          }`}
                        >
                          <p>{message.content}</p>
                          <div className="flex items-center justify-between mt-1 text-xs opacity-70">
                            <span>{new Date(message.createdAt).toLocaleString()}</span>
                            {message.fromUserId === user?.id && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteMessageMutation.mutate(message.id)}
                                className="p-1 h-auto"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Message Input */}
              {(selectedConversation || showNewMessage) && (
                <>
                  <Separator className="my-4" />
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      className="flex-1"
                      maxLength={500}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sendMessageMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {sendMessageMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {newMessage.length}/500 characters
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}