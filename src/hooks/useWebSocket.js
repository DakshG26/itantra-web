import { useState, useEffect, useRef, useCallback } from 'react';

export function useWebSocket(url, { onMessage, onError, onConnect, onDisconnect } = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'connecting' | 'connected' | 'disconnected'
  const [lastError, setLastError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const connect = useCallback(() => {
    if (!url) return;
    setConnectionStatus('connecting');

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setConnectionStatus('connected');
        setLastError(null);
        if (onConnect) onConnect();
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (onMessage) onMessage(parsed);
        } catch (e) {
          if (onMessage) onMessage(event.data);
        }
      };

      ws.onerror = (err) => {
        setLastError('WebSocket error occurred');
        if (onError) onError(err);
      };

      ws.onclose = () => {
        setIsConnected(false);
        setConnectionStatus('disconnected');
        if (onDisconnect) onDisconnect();

        // Attempt reconnection after 3 seconds
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };
    } catch (e) {
      setConnectionStatus('disconnected');
      setLastError(e.message);
    }
  }, [url, onMessage, onError, onConnect, onDisconnect]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const payload = typeof data === 'string' ? data : JSON.stringify(data);
      wsRef.current.send(payload);
      return true;
    }
    return false;
  }, []);

  return {
    isConnected,
    connectionStatus,
    lastError,
    sendMessage
  };
}
