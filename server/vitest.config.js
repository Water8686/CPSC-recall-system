import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      API_MOCK_MODE: 'true',
    },
    include: ['src/**/*.test.js'],
  },
});
