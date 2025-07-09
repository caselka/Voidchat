import { useEffect, useRef, useState } from "react";

interface RoomWebSocketOptions {
  onMessage?: (data: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function useWebSocket(url: string, options: RoomWebSocketOptions = {}) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const connect = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}${url}`;
    
    console.log('Connecting to room WebSocket:', wsUrl);
    
    try {
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        setIsConnected(true);
        console.log('Room WebSocket connected successfully');
        options.onConnect?.();
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          options.onMessage?.(message);
        } catch (error) {
          console.error('Error parsing room WebSocket message:', error);
        }
      };

      ws.current.onclose = (event) => {
        setIsConnected(false);
        console.log('Room WebSocket closed:', event.code, event.reason);
        options.onDisconnect?.();
        
        // Reconnect if not a normal closure
        if (event.code !== 1000 && event.code !== 1001) {
          console.log('Attempting to reconnect room WebSocket in 3 seconds...');
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };

      ws.current.onerror = (error) => {
        console.error('Room WebSocket error:', error);
        setIsConnected(false);
        options.onDisconnect?.();
      };
    } catch (error) {
      console.error('Error creating room WebSocket:', error);
      setIsConnected(false);
    }
  };

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (ws.current) {
        ws.current.close(1000, 'Component unmounted');
      }
    };
  }, [url]);

  return { isConnected };
}