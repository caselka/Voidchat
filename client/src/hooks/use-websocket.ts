import { useEffect, useRef, useState } from "react";

export interface Message {
  id: string | number;
  content: string;
  username: string;
  timestamp: string;
  createdAt?: string;
  expiresAt?: string;
  isAd?: boolean;
  replyToId?: number;
}

export interface WebSocketHook {
  messages: Message[];
  isConnected: boolean;
  isGuardian: boolean;
  currentUser: string;
  onlineCount: number;
  sendMessage: (content: string, replyToId?: number) => void;
  muteUser: (messageId: string | number) => void;
  deleteMessage: (messageId: string | number) => void;
  enableSlowMode: () => void;
  error: string | null;
  rateLimitTime: number;
}

export function useWebSocket(): WebSocketHook {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isGuardian, setIsGuardian] = useState(false);
  const [currentUser, setCurrentUser] = useState<string>('');
  const [onlineCount, setOnlineCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitTime, setRateLimitTime] = useState(0);
  const [messagesLoaded, setMessagesLoaded] = useState(false);

  const connect = () => {
    // Use wss for secure connections (https) and ws for local dev
    const protocol = window.location.protocol === 'https:' ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log('Connecting to WebSocket:', wsUrl);
    
    try {
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        setIsConnected(true);
        setError(null);
        console.log('WebSocket connected successfully');
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          switch (message.type) {
            case 'initial_messages':
              // Only use WebSocket messages if API messages haven't loaded yet
              if (!messagesLoaded) {
                setMessages(message.data.reverse());
                setMessagesLoaded(true);
              }
              break;
              
            case 'message':
              setMessages(prev => [...prev, message.data]);
              break;
              
            case 'guardian_status':
              setIsGuardian(message.data.isGuardian);
              break;
              
            case 'current_user':
              setCurrentUser(message.data.username);
              break;
              
            case 'online_count':
              setOnlineCount(message.data.count);
              break;
              
            case 'message_deleted':
              setMessages(prev => prev.filter(msg => msg.id !== message.data.messageId));
              break;
              
            case 'system_message':
              const systemMsg: Message = {
                id: `system-${Date.now()}`,
                content: message.data.message,
                username: 'system',
                timestamp: new Date().toISOString(),
                isAd: false,
              };
              setMessages(prev => [...prev, systemMsg]);
              break;
              
            case 'error':
              setError(message.data.message);
              if (message.data.message.includes('rate limited') || message.data.message.includes('blocked')) {
                setRateLimitTime(5);
              }
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.current.onclose = (event) => {
        setIsConnected(false);
        console.log('WebSocket closed:', event.code, event.reason);
        
        // Reconnect if not a normal closure and if the component is still mounted
        if (event.code !== 1000 && event.code !== 1001) {
          console.log('Attempting to reconnect in 3 seconds...');
          reconnectTimeoutRef.current = setTimeout(() => {
            if (!ws.current || ws.current.readyState === WebSocket.CLOSED) {
              connect();
            }
          }, 3000);
        }
      };

      ws.current.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('Connection error - check server');
        setIsConnected(false);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setError('Failed to connect');
      // Retry connection after 5 seconds
      reconnectTimeoutRef.current = setTimeout(connect, 5000);
    }
  };

  useEffect(() => {
    // Load messages from API first, then connect to WebSocket
    const loadInitialMessages = async () => {
      try {
        const response = await fetch('/api/recent-messages');
        if (response.ok) {
          const apiMessages = await response.json();
          const formattedMessages = apiMessages.map((msg: any) => ({
            id: msg.id,
            content: msg.content,
            username: msg.username,
            timestamp: msg.createdAt,
            createdAt: msg.createdAt,
            expiresAt: msg.expiresAt,
            replyToId: msg.replyToId,
            isAd: false,
          }));
          setMessages(formattedMessages);
          setMessagesLoaded(true);
        }
      } catch (error) {
        console.error('Error loading initial messages:', error);
      }
    };

    loadInitialMessages();
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (ws.current) {
        ws.current.close(1000, 'Component unmounting');
      }
    };
  }, []);

  // Rate limit countdown
  useEffect(() => {
    if (rateLimitTime > 0) {
      const timer = setTimeout(() => {
        setRateLimitTime(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [rateLimitTime]);

  const sendMessage = (content: string, replyToId?: number) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'send_message',
        data: { content, replyToId }
      }));
      setError(null);
    } else {
      setError('Not connected - trying to reconnect...');
      connect();
    }
  };

  const muteUser = (messageId: string | number) => {
    const message = messages.find(m => m.id === messageId);
    if (message && ws.current && ws.current.readyState === WebSocket.OPEN) {
      // Extract IP from message context (in real implementation, this would be handled server-side)
      ws.current.send(JSON.stringify({
        type: 'guardian_action',
        data: { action: 'mute', messageId }
      }));
    }
  };

  const deleteMessage = (messageId: string | number) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'guardian_action',
        data: { action: 'delete', messageId }
      }));
    }
  };

  const enableSlowMode = () => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'guardian_action',
        data: { action: 'slow_mode' }
      }));
    }
  };

  return {
    messages,
    isConnected,
    isGuardian,
    currentUser,
    onlineCount,
    sendMessage,
    muteUser,
    deleteMessage,
    enableSlowMode,
    error,
    rateLimitTime,
  };
}
