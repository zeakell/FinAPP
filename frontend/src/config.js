// src/config.js

// Ambil hostname dari browser (misal: "localhost" atau "192.168.8.111")
const hostname = window.location.hostname;

// Tentukan Port Backend Anda
const port = '8081';

// Gabungkan menjadi URL lengkap
// Hasil: "http://192.168.8.111:8081/api"
export const API_BASE_URL = `http://${hostname}:${port}/api`;