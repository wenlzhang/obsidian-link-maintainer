import esbuild from 'esbuild';

const isProd = process.argv.includes('production');

esbuild.build({
  entryPoints: ['main.ts'],
  bundle: true,
  minify: isProd,
  sourcemap: !isProd,
  platform: 'node',
  target: 'es2020',
  outfile: 'main.js',
  external: ['obsidian'],
}).catch(() => process.exit(1));
