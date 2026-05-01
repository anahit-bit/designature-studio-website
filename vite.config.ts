import fs from 'fs';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const FALLBACK_ENV_DIR = 'E:/Secrets/Website';

export default defineConfig(({ mode }) => {
  const envDir = fs.existsSync('.env')
    ? '.'
    : fs.existsSync(`${FALLBACK_ENV_DIR}/.env`)
    ? FALLBACK_ENV_DIR
    : '.';
  const env = loadEnv(mode, envDir, '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GOOGLE_CLIENT_ID': JSON.stringify(env.GOOGLE_CLIENT_ID),
    },
    resolve: { alias: { '@': path.resolve(__dirname, '.') } },
    server: { port: 3000, host: '0.0.0.0' },
  };
});
