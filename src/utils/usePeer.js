// usePeer.js — WebRTC P2P hook using PeerJS
import { useState, useEffect, useRef, useCallback } from 'react';
import Peer from 'peerjs';

export function usePeer() {
  const [myId, setMyId] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | initializing | ready | connecting | connected | disconnected | error
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [remoteName, setRemoteName] = useState(null);

  const peerRef = useRef(null);
  const connRef = useRef(null);

  // Generate a friendly tactical ID
  const generateId = () => {
    const prefix = ['ALPHA', 'BRAVO', 'DELTA', 'ECHO', 'FOXTROT'][Math.floor(Math.random() * 5)];
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${suffix}`;
  };

  const addMessage = useCallback((msg) => {
    setMessages(prev => [...prev, { ...msg, id: Date.now() + Math.random() }]);
  }, []);

  const setupConnectionHandlers = useCallback((conn) => {
    connRef.current = conn;

    conn.on('open', () => {
      setStatus('connected');
      setIsConnected(true);
      setRemoteName(conn.peer);
      addMessage({
        type: 'system',
        text: `🔗 Secure channel established with ${conn.peer}`,
        timestamp: Date.now(),
      });
    });

    conn.on('data', (data) => {
      try {
        const packet = typeof data === 'string' ? JSON.parse(data) : data;
        if (packet.type === 'message' || packet.type === 'sos') {
          addMessage({
            ...packet,
            direction: 'received',
            timestamp: Date.now(),
            latencyMs: packet.sentAt ? Date.now() - packet.sentAt : null,
          });
        }
      } catch (e) {
        console.warn('Invalid packet received', e);
      }
    });

    conn.on('close', () => {
      setStatus('disconnected');
      setIsConnected(false);
      connRef.current = null;
      addMessage({
        type: 'system',
        text: '🔌 Radio link closed. Connection terminated.',
        timestamp: Date.now(),
      });
    });

    conn.on('error', (err) => {
      setError(err.message);
      setStatus('error');
      setIsConnected(false);
    });
  }, [addMessage]);

  // Initialize peer
  useEffect(() => {
    setStatus('initializing');
    const id = generateId();

    const peer = new Peer(id, {
      // Use PeerJS public cloud server
      host: '0.peerjs.com',
      port: 443,
      path: '/',
      secure: true,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      },
    });

    peerRef.current = peer;

    peer.on('open', (assignedId) => {
      setMyId(assignedId);
      setStatus('ready');
    });

    peer.on('connection', (conn) => {
      // Incoming connection from remote peer
      setStatus('connected');
      setupConnectionHandlers(conn);
    });

    peer.on('disconnected', () => {
      setStatus('disconnected');
      setIsConnected(false);
    });

    peer.on('error', (err) => {
      console.warn('PeerJS error:', err);
      setError(err.message || 'Connection error');
      setStatus('error');
    });

    return () => {
      if (connRef.current) connRef.current.close();
      peer.destroy();
    };
  }, [setupConnectionHandlers]);

  // Connect to a remote peer
  const connect = useCallback((remoteId) => {
    if (!peerRef.current || !remoteId.trim()) return;
    setStatus('connecting');
    const conn = peerRef.current.connect(remoteId.trim(), {
      reliable: true,
      serialization: 'json',
    });
    setupConnectionHandlers(conn);
  }, [setupConnectionHandlers]);

  // Send a message packet
  const sendMessage = useCallback((text, lang, isEmergency = false) => {
    if (!connRef.current || !isConnected) return false;
    const packet = {
      type: isEmergency ? 'sos' : 'message',
      text,
      lang,
      bytes: 18,
      sentAt: Date.now(),
      priority: isEmergency ? 0xFF : 0x00,
    };
    try {
      connRef.current.send(JSON.stringify(packet));
      addMessage({
        ...packet,
        direction: 'sent',
        timestamp: Date.now(),
        latencyMs: 0,
      });
      return true;
    } catch (e) {
      console.warn('Send failed:', e);
      return false;
    }
  }, [isConnected, addMessage]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (connRef.current) {
      connRef.current.close();
      connRef.current = null;
    }
    setIsConnected(false);
    setStatus('ready');
    setRemoteName(null);
  }, []);

  // Clear messages
  const clearMessages = useCallback(() => setMessages([]), []);

  return {
    myId,
    status,
    error,
    messages,
    isConnected,
    remoteName,
    connect,
    sendMessage,
    disconnect,
    clearMessages,
  };
}
