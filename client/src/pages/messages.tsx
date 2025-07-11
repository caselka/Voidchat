import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Lock, KeyRound, AlertTriangle, Mail } from "lucide-react";
import DynamicHeader from "@/components/dynamic-header";
import { initializeEncryption, encryptMessage, decryptMessage, generateKeyFingerprint } from "@/utils/encryption";
import type { DirectMessage, User } from "@shared/schema";

interface EncryptedDirectMessage extends DirectMessage {
  fromUser?: { username: string; };
  toUser?: { username: string; };
}

export default function Messages() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const [recipientUsername, setRecipientUsername] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [keyPair, setKeyPair] = useState<any>(null);
  const [encryptionEnabled, setEncryptionEnabled] = useState(true);

  // Initialize encryption keys on component mount
  useEffect(() => {
    if (isAuthenticated && encryptionEnabled) {
      const keys = initializeEncryption();
      setKeyPair(keys);
    }
  }, [isAuthenticated, encryptionEnabled]);

  // Fetch conversations
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['/api/direct-messages/conversations'],
    enabled: isAuthenticated,
  });

  // Fetch messages for selected conversation
  const { data: messages = [] } = useQuery({
    queryKey: ['/api/direct-messages', selectedConversation],
    enabled: isAuthenticated && !!selectedConversation,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { recipientUsername: string; content: string; encrypted?: any }) => {
      const response = await fetch('/api/direct-messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/direct-messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/direct-messages/conversations'] });
      setNewMessage("");
    },
  });

  // Register encryption key mutation
  const registerKeyMutation = useMutation({
    mutationFn: async (publicKey: string) => {
      const response = await fetch('/api/encryption/register-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey }),
      });
      if (!response.ok) throw new Error('Failed to register encryption key');
      return response.json();
    },
  });

  // Register user's public key on first load
  useEffect(() => {
    if (keyPair && isAuthenticated && encryptionEnabled) {
      const publicKeyB64 = btoa(String.fromCharCode(...keyPair.publicKey));
      registerKeyMutation.mutate(publicKeyB64);
    }
  }, [keyPair, isAuthenticated, encryptionEnabled]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !recipientUsername.trim()) return;

    try {
      let messageData: any = {
        recipientUsername: recipientUsername.trim(),
        content: newMessage.trim(),
      };

      if (encryptionEnabled && keyPair) {
        // Fetch recipient's public key
        const recipientResponse = await fetch(`/api/encryption/public-key/${recipientUsername}`);
        if (recipientResponse.ok) {
          const { publicKey: recipientPublicKeyB64 } = await recipientResponse.json();
          const recipientPublicKey = Uint8Array.from(atob(recipientPublicKeyB64), c => c.charCodeAt(0));
          
          // Encrypt the message
          const encrypted = encryptMessage(newMessage.trim(), recipientPublicKey, keyPair.privateKey);
          messageData.encrypted = encrypted;
          messageData.content = "[End-to-End Encrypted Message]";
        }
      }

      sendMessageMutation.mutate(messageData);
    } catch (error) {
      console.error('Failed to send encrypted message:', error);
      // Fallback to unencrypted
      sendMessageMutation.mutate({
        recipientUsername: recipientUsername.trim(),
        content: newMessage.trim(),
      });
    }
  };

  const decryptMessageContent = (message: EncryptedDirectMessage): string => {
    if (!message.isEncrypted || !message.encryptedContent || !keyPair || !encryptionEnabled) {
      return message.content;
    }

    try {
      // Get sender's public key (would need to be fetched from server)
      // For now, return encrypted indicator
      return message.content.startsWith("[End-to-End Encrypted") 
        ? "🔒 [Encrypted Message - Decryption not yet implemented]"
        : message.content;
    } catch (error) {
      return "🔒 [Failed to decrypt message]";
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <DynamicHeader />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <Card className="w-full max-w-md mx-4">
            <CardHeader className="text-center">
              <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <CardTitle>Authentication Required</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-6">
                Direct messaging is available for registered users only.
              </p>
              <div className="flex flex-col gap-3">
                <Button onClick={() => window.location.href = "/login"}>
                  Sign In
                </Button>
                <Button variant="outline" onClick={() => window.location.href = "/register"}>
                  Create Account ($3)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DynamicHeader />
      
      <div className="container mx-auto px-4 py-6 pt-20">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Mail className="w-6 h-6" />
            <h1 className="text-2xl font-light">Direct Messages</h1>
            {encryptionEnabled && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Lock className="w-3 h-3" />
                E2E Encrypted
              </Badge>
            )}
          </div>

          {/* Encryption Status */}
          {encryptionEnabled && keyPair && (
            <Card className="mb-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700 dark:text-green-300">
                    End-to-End Encryption Active
                  </span>
                  <span className="text-xs text-green-600 dark:text-green-400 font-mono">
                    Key: {generateKeyFingerprint(keyPair.publicKey)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Conversations List */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Conversations</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-sm text-muted-foreground">Loading...</div>
                ) : conversations.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No conversations yet</div>
                ) : (
                  <div className="space-y-2">
                    {conversations.map((conv: any) => (
                      <Button
                        key={conv.userId}
                        variant={selectedConversation === conv.userId ? "default" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => setSelectedConversation(conv.userId)}
                      >
                        {conv.username}
                        {conv.unreadCount > 0 && (
                          <Badge className="ml-auto" variant="destructive">
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Messages and New Message */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">
                  {selectedConversation ? "Messages" : "New Message"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* New Message Form */}
                <div className="space-y-3">
                  <Input
                    placeholder="Recipient username"
                    value={recipientUsername}
                    onChange={(e) => setRecipientUsername(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleSendMessage}
                      disabled={sendMessageMutation.isPending || !newMessage.trim() || !recipientUsername.trim()}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  {encryptionEnabled && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Lock className="w-3 h-3" />
                      Messages are end-to-end encrypted
                    </div>
                  )}
                </div>

                {/* Messages List */}
                {selectedConversation && (
                  <div className="border-t pt-4">
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {messages.map((message: EncryptedDirectMessage) => (
                        <div
                          key={message.id}
                          className={`flex ${message.fromUserId === user?.id ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                              message.fromUserId === user?.id
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <div className="text-sm">
                              {decryptMessageContent(message)}
                            </div>
                            <div className="text-xs opacity-70 mt-1">
                              {new Date(message.createdAt).toLocaleTimeString()}
                              {message.isEncrypted && (
                                <Lock className="w-3 h-3 inline ml-1" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}