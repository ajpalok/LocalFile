'use client';

import { useEffect, useState, useRef } from 'react';
import { Device, Message } from '@/types';
import { WebRTCManager } from '@/lib/webrtc';

interface ChatInterfaceProps {
  webrtcManager: WebRTCManager | null;
  selectedDevice: Device;
  myDeviceName: string;
  onBack: () => void;
}

interface FileTransferState {
  name: string;
  size: number;
  type: string;
  chunks: ArrayBuffer[];
  totalChunks: number;
  receivedChunks: number;
  status: 'receiving' | 'completed';
  progress: number; // Progress percentage (0-100)
}

export default function ChatInterface({ webrtcManager, selectedDevice, myDeviceName, onBack }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileTransferRef = useRef<FileTransferState | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!webrtcManager) return;

    // Set up connection state callback
    webrtcManager.onConnectionState((peerId, state) => {
      if (peerId === selectedDevice.id) {
        setIsConnected(state === 'connected');
        console.log(`Connection state with ${peerId}: ${state}`);
      }
    });

    // Check initial connection state
    setIsConnected(webrtcManager.isConnected(selectedDevice.id));

    // Set up message handler
    webrtcManager.onMessage((peerId, data) => {
      if (peerId !== selectedDevice.id) return;

      // Filter out file transfer control messages
      try {
        const parsed = JSON.parse(data.message);
        if (parsed.type === 'file-accepted' || parsed.type === 'file-declined') {
          // Don't display file transfer control messages as chat messages
          return;
        }
      } catch (e) {
        // Not a JSON message, continue normally
      }

      setMessages((prev) => [...prev, {
        message: data.message,
        senderId: peerId,
        senderName: data.senderName,
        timestamp: data.timestamp,
        isSent: false
      }]);
    });

    // Set up file transfer handler
    webrtcManager.onFileTransfer((peerId, data) => {
      if (peerId !== selectedDevice.id) return;

      if (data.type === 'file-metadata') {
        if (!data.name || !data.size) return; // Guard against missing required fields

        console.log(`Received file offer: ${data.name} (${data.size} bytes) from ${peerId}`);

        // Show file offer message with accept/decline options
        setMessages((prev) => [...prev, {
          message: `📎 File offer: ${data.name} (${(data.size! / 1024 / 1024).toFixed(2)} MB)`,
          senderId: peerId,
          senderName: data.senderName || 'Unknown',
          timestamp: data.timestamp || Date.now(),
          isSent: false,
          fileOffer: {
            name: data.name || '',
            size: data.size || 0,
            type: data.fileType || 'application/octet-stream',
            transferId: data.transferId || `${peerId}-${Date.now()}`
          }
        }]);
      } else if (data.type === 'file-accepted' && data.transferId) {
        // File acceptance confirmation received by sender
        // The sender's sendFile function handles the actual transfer initiation
        // No action needed here as the transfer state is managed by sendFile
        console.log(`File transfer accepted for transferId: ${data.transferId}`);
      } else if (data.type === 'file-declined' && data.transferId) {
        // Handle declined file transfer
        setMessages((prev) => prev.map((msg) =>
          msg.message.includes('📤 Sending file:') && msg.isSent
            ? { ...msg, message: `❌ File transfer declined by recipient` }
            : msg
        ));
      } else if (data.type === 'file-data' && fileTransferRef.current && data.data) {
        // Handle binary file data
        const transfer = fileTransferRef.current;
        transfer.chunks.push(data.data);
        transfer.receivedChunks++;
        transfer.progress = Math.round((transfer.receivedChunks / transfer.totalChunks) * 100);

        // Update progress message every 10% or on completion
        if (transfer.progress % 10 === 0 || transfer.receivedChunks >= transfer.totalChunks) {
          setMessages((prev) => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage && lastMessage.message.includes(`📎 Receiving file: ${transfer.name}`)) {
              // Update the progress in the existing message
              return prev.map((msg, idx) =>
                idx === prev.length - 1
                  ? { ...msg, message: `📎 Receiving file: ${transfer.name} (${(transfer.size / 1024 / 1024).toFixed(2)} MB) - ${transfer.progress}%` }
                  : msg
              );
            }
            return prev;
          });
        }

        // Check if all chunks received
        if (transfer.receivedChunks >= transfer.totalChunks) {
          // Reconstruct file from binary chunks
          const totalSize = transfer.chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
          const combined = new Uint8Array(totalSize);
          let offset = 0;

          for (const chunk of transfer.chunks) {
            combined.set(new Uint8Array(chunk), offset);
            offset += chunk.byteLength;
          }

          // Create download link
          const blob = new Blob([combined], { type: transfer.type });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = transfer.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          setMessages((prev) => [...prev, {
            message: `✅ File received: ${transfer.name}`,
            senderId: peerId,
            senderName: selectedDevice.name,
            timestamp: Date.now(),
            isSent: false
          }]);

          fileTransferRef.current = null;
        }
      }
    });
  }, [webrtcManager, selectedDevice]);

  const sendMessage = () => {
    if (!webrtcManager || !inputMessage.trim()) return;

    if (!isConnected) {
      alert('Connection is not established yet. Please wait for the connection to be established before sending messages.');
      return;
    }

    const success = webrtcManager.sendMessage(selectedDevice.id, inputMessage);
    
    if (success) {
      setMessages((prev) => [...prev, {
        message: inputMessage,
        senderId: 'me',
        senderName: myDeviceName,
        timestamp: Date.now(),
        isSent: true
      }]);
      setInputMessage('');
    } else {
      alert('Failed to send message. The connection may have been lost.');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !webrtcManager) return;

    console.log(`Starting file transfer for ${file.name} (${file.size} bytes)`);

    setMessages((prev) => [...prev, {
      message: `📤 Sending file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
      senderId: 'me',
      senderName: myDeviceName,
      timestamp: Date.now(),
      isSent: true
    }]);

    const success = await webrtcManager.sendFile(selectedDevice.id, file);
    
    if (success) {
      console.log(`File transfer completed successfully for ${file.name}`);
      setMessages((prev) => [...prev, {
        message: `✅ File sent: ${file.name}`,
        senderId: 'me',
        senderName: myDeviceName,
        timestamp: Date.now(),
        isSent: true
      }]);
    } else {
      console.log(`File transfer failed for ${file.name}`);
      setMessages((prev) => [...prev, {
        message: `❌ Failed to send file: ${file.name}`,
        senderId: 'me',
        senderName: myDeviceName,
        timestamp: Date.now(),
        isSent: true
      }]);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const acceptFileOffer = (transferId: string, fileName: string, fileSize: number, fileType: string) => {
    if (!webrtcManager) return;

    console.log(`Accepting file offer: ${fileName} (${fileSize} bytes), transferId: ${transferId}`);

    // Initialize file transfer state
    const chunkSize = 16384; // 16KB chunks (same as sender)
    const totalChunks = Math.ceil(fileSize / chunkSize);

    fileTransferRef.current = {
      name: fileName,
      size: fileSize,
      type: fileType,
      chunks: [],
      totalChunks: totalChunks,
      receivedChunks: 0,
      status: 'receiving',
      progress: 0
    };

    // Send acceptance message to sender
    webrtcManager.sendMessage(selectedDevice.id, JSON.stringify({
      type: 'file-accepted',
      transferId: transferId
    }));

    // Update the message to show transfer in progress
    setMessages((prev) => prev.map((msg) =>
      msg.fileOffer?.transferId === transferId
        ? { ...msg, message: `📥 Downloading: ${fileName} (0%)`, fileOffer: undefined }
        : msg
    ));
  };

  const declineFileOffer = (transferId: string, fileName: string) => {
    if (!webrtcManager) return;

    console.log(`Declining file offer: ${fileName}, transferId: ${transferId}`);

    // Send decline message to sender
    webrtcManager.sendMessage(selectedDevice.id, JSON.stringify({
      type: 'file-declined',
      transferId: transferId
    }));

    // Update the message to show declined
    setMessages((prev) => prev.map((msg) =>
      msg.fileOffer?.transferId === transferId
        ? { ...msg, message: `❌ Declined file: ${fileName}`, fileOffer: undefined }
        : msg
    ));
  };

  return (
    <div className="flex flex-col h-full max-h-screen">
      {/* Chat Header */}
      <div className="bg-indigo-600 text-white p-4 flex items-center gap-3">
        <button
          onClick={onBack}
          className="hover:bg-indigo-700 p-2 rounded-lg transition-colors"
          aria-label="Go back"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h2 className="text-lg sm:text-xl font-semibold truncate">{selectedDevice.name}</h2>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`}></div>
            <p className="text-indigo-200 text-xs sm:text-sm">
              {isConnected ? 'Connected' : 'Connecting...'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-sm sm:text-base">No messages yet. Start the conversation!</p>
            <p className="text-xs mt-2">Messages and files are sent directly peer-to-peer</p>
          </div>
        )}
        
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.isSent ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[70%] rounded-lg px-4 py-2 ${
                msg.isSent
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-800 border border-gray-200'
              }`}
            >
              <p className="text-xs opacity-75 mb-1">
                {msg.isSent ? 'You' : msg.senderName}
              </p>
              <p className="break-words whitespace-pre-wrap text-sm sm:text-base">{msg.message}</p>
              {msg.fileOffer && (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => acceptFileOffer(
                      msg.fileOffer!.transferId,
                      msg.fileOffer!.name,
                      msg.fileOffer!.size,
                      msg.fileOffer!.type
                    )}
                    className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => declineFileOffer(msg.fileOffer!.transferId, msg.fileOffer!.name)}
                    className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                  >
                    Decline
                  </button>
                </div>
              )}
              <p className="text-xs opacity-75 mt-1">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-2 sm:p-4 bg-white">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="flex gap-1 sm:gap-2 items-end">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 sm:p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
            title="Send file"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isConnected ? "Type a message..." : "Waiting for connection..."}
              className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base text-black"
              autoFocus={true}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || !isConnected}
            className="px-3 py-2 sm:px-4 sm:px-6 sm:py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex-shrink-0 text-xs sm:text-sm sm:text-base font-medium whitespace-nowrap"
          >
            <span className="hidden sm:inline">Send</span>
            <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
