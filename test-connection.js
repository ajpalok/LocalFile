#!/usr/bin/env node

/**
 * Connection Stability Test Script
 * This script tests the WebSocket connection stability by monitoring
 * connection events and heartbeat responses.
 */

const { io } = require('socket.io-client');

// Configuration
const SERVER_URL = 'http://localhost:3000';
const TEST_DURATION = 1 * 60 * 1000; // 1 minute
const HEARTBEAT_INTERVAL = 30 * 1000; // 30 seconds

console.log('🧪 Starting Connection Stability Test...');
console.log(`📡 Server: ${SERVER_URL}`);
console.log(`⏱️  Duration: ${TEST_DURATION / 1000} seconds`);
console.log(`💓 Heartbeat: ${HEARTBEAT_INTERVAL / 1000} seconds`);
console.log('─'.repeat(50));

let connectionCount = 0;
let disconnectionCount = 0;
let heartbeatCount = 0;
let heartbeatResponseCount = 0;
let startTime = Date.now();

const socket = io(SERVER_URL, {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 20000,
  transports: ['websocket', 'polling']
});

// Event handlers
socket.on('connect', () => {
  connectionCount++;
  console.log(`🔗 Connected (attempt ${connectionCount}) - Socket ID: ${socket.id}`);
});

socket.on('disconnect', (reason) => {
  disconnectionCount++;
  console.log(`❌ Disconnected (reason: ${reason}) - Total disconnects: ${disconnectionCount}`);
});

socket.on('reconnect', (attemptNumber) => {
  console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
});

socket.on('reconnect_attempt', (attemptNumber) => {
  console.log(`🔄 Reconnection attempt ${attemptNumber}`);
});

socket.on('reconnect_error', (error) => {
  console.log(`❌ Reconnection error: ${error.message}`);
});

socket.on('reconnect_failed', () => {
  console.log('💀 Failed to reconnect after all attempts');
});

socket.on('heartbeat-response', () => {
  heartbeatResponseCount++;
  console.log(`💓 Heartbeat response ${heartbeatResponseCount}`);
});

// Send periodic heartbeats
const heartbeatTimer = setInterval(() => {
  if (socket.connected) {
    heartbeatCount++;
    socket.emit('heartbeat');
    console.log(`💓 Sent heartbeat ${heartbeatCount}`);
  }
}, HEARTBEAT_INTERVAL);

// Test completion
setTimeout(() => {
  clearInterval(heartbeatTimer);
  const duration = (Date.now() - startTime) / 1000;

  console.log('\n─'.repeat(50));
  console.log('📊 Test Results:');
  console.log(`⏱️  Duration: ${duration.toFixed(1)} seconds`);
  console.log(`🔗 Connections: ${connectionCount}`);
  console.log(`❌ Disconnections: ${disconnectionCount}`);
  console.log(`💓 Heartbeats sent: ${heartbeatCount}`);
  console.log(`💓 Heartbeat responses: ${heartbeatResponseCount}`);

  const stability = disconnectionCount === 0 ? 'Perfect' :
                    disconnectionCount <= 2 ? 'Good' :
                    disconnectionCount <= 5 ? 'Fair' : 'Poor';

  console.log(`📈 Stability: ${stability}`);

  socket.disconnect();
  process.exit(0);
}, TEST_DURATION);

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  clearInterval(heartbeatTimer);
  socket.disconnect();
  process.exit(0);
});