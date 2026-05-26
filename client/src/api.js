import axios from "axios";
import { io } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const api = axios.create({ baseURL: `${API_URL}/api` });

// Attach JWT to every request if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Single shared socket connection for live alerts/transactions
export const socket = io(API_URL, { autoConnect: false });

export function connectSocket() {
  if (!socket.connected) socket.connect();
}
