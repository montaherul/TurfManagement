import { io } from 'socket.io-client';

let socket = null;

const getSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) return import.meta.env.VITE_SOCKET_URL;
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL.replace(/\/api$/, '');
  return window.location.origin;
};

/**
 * Singleton socket connection, authenticated with the current access token.
 * Reconnects automatically when the token changes.
 */
export const connectSocket = () => {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    disconnectSocket();
    return null;
  }
  if (socket && socket.connected) return socket;

  if (socket) {
    socket.disconnect();
  }

  socket = io(getSocketUrl(), {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect_error', () => {
    socket?.disconnect();
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export default connectSocket;