import { io } from "socket.io-client";
import { SOCKET_URL } from "./api";

let socket = null;

export function connectSocket(token) {
  if (!token) return null;
  if (socket) {
    if (socket.auth && socket.auth.token === token) return socket;
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 25,
    reconnectionDelay: 800,
    reconnectionDelayMax: 6000,
    timeout: 12000,
    autoConnect: true,
  });
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function emitWithAck(event, payload, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const s = socket;
    if (!s || !s.connected) return reject(new Error("Realtime connection is offline"));
    let done = false;
    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        reject(new Error("The server did not respond. Try again."));
      }
    }, timeout);
    s.emit(event, payload, (response) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (response && response.ok === false) reject(new Error(response.error || "Action failed"));
      else resolve(response || { ok: true });
    });
  });
}

export { SOCKET_URL };
