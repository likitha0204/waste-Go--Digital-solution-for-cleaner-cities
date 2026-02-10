// config.js
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export const MQTT_URL = import.meta.env.VITE_MQTT_URL || 'ws://localhost:8888';

export default API_URL;
