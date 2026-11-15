import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Only the `@/` alias, so tests can import modules the way the app does.
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
});
