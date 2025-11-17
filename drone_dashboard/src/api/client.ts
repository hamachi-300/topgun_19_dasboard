import axios from 'axios';

export const API_BASE = import.meta.env.VITE_TESA_API_BASE as string;

export const api = axios.create({ baseURL: API_BASE, timeout: 15000 });

export function authHeaders(token?: string) {
  return token ? { 'x-camera-token': token } : {};
}
