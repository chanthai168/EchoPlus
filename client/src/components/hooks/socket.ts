// src/socket.ts
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(import.meta.env.VITE_BACKEND_URL, { transports: ['websocket'] });
    socket.on('connect_error', (e) => console.error('Socket error:', e.message));
  }
  return socket;
}