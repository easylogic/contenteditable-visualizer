import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 5175,
    host: process.env.CI ? '0.0.0.0' : 'localhost',
    open: !process.env.CI,
  },
});
