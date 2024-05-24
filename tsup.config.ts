import type { Options } from 'tsup';

const opts: Options = {
  entryPoints: ['src/index.ts'],
  outDir: 'dist',
  target: 'node18',
  format: ['esm'],
  clean: true,
  dts: true,
  minify: true,
};
export default opts;
