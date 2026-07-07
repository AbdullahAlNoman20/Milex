import axios from 'axios';

const api = axios.create({ baseURL: '/', timeout: 10000, headers: { 'Content-Type': 'application/json' } });

api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err instanceof Error ? err : new Error('Network request failed'))
);

export default api;