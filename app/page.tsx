'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getDeviceName } from '@/lib/deviceName';
import { Device } from '@/types';
import DeviceList from '@/components/DeviceList';
import ChatInterface from '@/components/ChatInterface';

export default function Home() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [myDeviceName, setMyDeviceName] = useState<string>('Loading...');
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'reconnecting' | 'disconnected'>('connecting');
  const [isMounted, setIsMounted] = useState(false);

  // Prevent browser tab suspension and keep connection alive
  useEffect(() => {
    let wakeLock: any = null;
    let antiIdleInterval: NodeJS.Timeout;

    // Request wake lock to prevent tab suspension
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
          console.log('Wake lock acquired - tab will stay active');
        }
      } catch (err) {
        console.log('Wake lock not supported or denied');
      }
    };

    // Prevent browser from considering tab idle
    const preventIdle = () => {
      // Minimal DOM operation to keep page "active"
      const timestamp = Date.now();
      document.documentElement.setAttribute('data-last-activity', timestamp.toString());
    };

    // Anti-idle mechanism - runs every 30 seconds
    antiIdleInterval = setInterval(preventIdle, 30000);

    // Request wake lock on mount
    requestWakeLock();

    // Re-acquire wake lock when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden && wakeLock === null) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Error handling
    const handleError = (event: ErrorEvent) => {
      console.error('Global error caught:', event.error);
      event.preventDefault();
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      event.preventDefault();
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      clearInterval(antiIdleInterval);
      if (wakeLock !== null) {
        wakeLock.release();
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    setIsMounted(true);
    
    // Initialize device name only after mount to avoid hydration mismatch
    const deviceName = getDeviceName();
    setMyDeviceName(deviceName);

    // Initialize socket connection only after mount
    // Prefer env var; enforce HTTPS when page is HTTPS to avoid mixed content
    const envUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL;
    let serverUrl = envUrl ?? window.location.origin;
    if (typeof window !== 'undefined') {
      const isHttpsPage = window.location.protocol === 'https:';
      const isLocal = serverUrl.includes('localhost') || serverUrl.includes('127.0.0.1');
      // If running on an HTTPS page and serverUrl is http (and not local), upgrade to https
      if (isHttpsPage && serverUrl.startsWith('http://') && !isLocal) {
        serverUrl = serverUrl.replace('http://', 'https://');
      }
      // Warn in production if env is missing to avoid connecting to Vercel origin
      if (!envUrl && process.env.NODE_ENV === 'production') {
        console.warn('NEXT_PUBLIC_SOCKET_SERVER_URL is not set; falling back to current origin. If deployed on Vercel, set this env to your public Socket.IO server URL.');
      }
    }
    const socketInstance = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity, // Never stop trying to reconnect
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    });

    socketInstance.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
      socketInstance.emit('register-device', deviceName);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      setIsConnected(false);
      
      // Only show disconnection if it's not due to intentional disconnection
      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        console.log('Server initiated disconnect');
      }
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Connection error:', error.message, error);
      setIsConnected(false);
    });

    socketInstance.on('connect_timeout', () => {
      console.error('Connection timeout');
      setIsConnected(false);
    });

    socketInstance.on('error', (error) => {
      console.error('Socket error:', error);
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log('Reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
      // Re-register device after reconnection
      socketInstance.emit('register-device', deviceName);
    });

    socketInstance.on('reconnect_error', (error) => {
      console.log('Reconnection failed:', error);
    });

    socketInstance.on('reconnect_failed', () => {
      console.log('Failed to reconnect after all attempts');
      // Don't set disconnected status immediately to prevent page reload
      setTimeout(() => {
        if (!socketInstance.connected) {
          setConnectionStatus('disconnected');
        }
      }, 5000); // Wait 5 seconds before marking as disconnected
    });

    socketInstance.on('heartbeat-response', () => {
      console.log('Heartbeat response received from server');
    });

    socketInstance.on('device-list', (deviceList: Device[]) => {
      console.log('Received device list:', deviceList);
      console.log('Current socket ID:', socketInstance.id);
      setDevices(deviceList);
      
      // If selected device is no longer in the list, deselect it
      if (selectedDevice && !deviceList.find(d => d.id === selectedDevice.id)) {
        setSelectedDevice(null);
      }
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Connection status management
  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      console.log('Connected to server');
      setConnectionStatus('connected');
    };

    const handleDisconnect = () => {
      console.log('Disconnected from server');
      setConnectionStatus('disconnected');
    };

    const handleReconnect = () => {
      console.log('Reconnected to server');
      setConnectionStatus('connected');
    };

    const handleReconnectAttempt = () => {
      console.log('Attempting to reconnect...');
      setConnectionStatus('reconnecting');
    };

    const handleReconnectError = () => {
      console.log('Reconnection failed');
      setConnectionStatus('disconnected');
    };

    const handleReconnectFailed = () => {
      console.log('Reconnection failed permanently');
      setConnectionStatus('disconnected');
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('reconnect', handleReconnect);
    socket.on('reconnect_attempt', handleReconnectAttempt);
    socket.on('reconnect_error', handleReconnectError);
    socket.on('reconnect_failed', handleReconnectFailed);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('reconnect', handleReconnect);
      socket.off('reconnect_attempt', handleReconnectAttempt);
      socket.off('reconnect_error', handleReconnectError);
      socket.off('reconnect_failed', handleReconnectFailed);
    };
  }, [socket]);

  // Heartbeat mechanism to keep connection alive
  useEffect(() => {
    if (!socket) return;

    const heartbeatInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('heartbeat');
      } else {
        // Try to reconnect if disconnected
        if (!socket.active) {
          console.log('Socket inactive, attempting reconnection');
          socket.connect();
        }
      }
    }, 50000); // Send heartbeat every 50 seconds

    // Monitor network state changes
    const handleOnline = () => {
      console.log('Network online - ensuring connection');
      if (!socket.connected) {
        socket.connect();
      }
    };

    const handleOffline = () => {
      console.log('Network offline - connection may be affected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [socket]);

  // Monitor visibility changes and actively maintain connection
  useEffect(() => {
    if (!socket) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Tab became visible');
        // Immediately send heartbeat when tab becomes active
        if (socket.connected) {
          socket.emit('heartbeat');
        } else {
          console.log('Socket disconnected while hidden, reconnecting...');
          socket.connect();
        }
      }
    };

    // Also handle page focus
    const handleFocus = () => {
      if (socket && !socket.connected) {
        console.log('Window focused, reconnecting socket');
        socket.connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [socket]);

  const handleDeviceSelect = (device: Device) => {
    setSelectedDevice(device);
  };

  const handleBackToDevices = () => {
    setSelectedDevice(null);
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-4 sm:px-4 sm:py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
                  LocalFile
                </h1>
                <p className="text-gray-600 text-sm sm:text-base">
                  P2P file sharing and messaging on your local network
                </p>
              </div>
              <div className="text-center sm:text-right">
                <div className="flex items-center justify-center sm:justify-end gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-green-500' :
                    connectionStatus === 'reconnecting' ? 'bg-yellow-500 animate-pulse' :
                    connectionStatus === 'disconnected' ? 'bg-red-500' :
                    'bg-gray-500'
                  }`}></div>
                  <span className="text-sm text-gray-600">
                    {connectionStatus === 'connected' ? 'Connected' :
                     connectionStatus === 'reconnecting' ? 'Reconnecting...' :
                     connectionStatus === 'disconnected' ? 'Disconnected' :
                     'Connecting...'}
                  </span>
                </div>
                <div className="bg-indigo-100 px-3 sm:px-4 py-2 rounded-lg">
                  <p className="text-sm text-gray-600">Your device name</p>
                  <p className="text-base sm:text-lg font-bold text-indigo-600 truncate">{myDeviceName}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {!selectedDevice ? (
              <DeviceList
                devices={devices}
                onDeviceSelect={handleDeviceSelect}
                isConnected={isConnected}
              />
            ) : (
              <ChatInterface
                socket={socket}
                selectedDevice={selectedDevice}
                myDeviceName={myDeviceName}
                onBack={handleBackToDevices}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
