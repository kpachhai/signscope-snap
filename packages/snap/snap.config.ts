import type { SnapConfig } from '@metamask/snaps-cli';
import { resolve } from 'path';

const config: SnapConfig = {
  bundler: 'webpack',
  input: resolve(__dirname, 'src/index.tsx'),
  server: {
    port: 8080,
  },
  typescript: {
    enabled: true,
  },
  polyfills: {
    buffer: true,
  },
  stats: {
    buffer: false,
  },
};

export default config;
