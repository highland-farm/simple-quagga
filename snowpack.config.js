module.exports = {
  mount: {
    src: { url: '/' },
    examples: { url: '/examples', static: true },
  },
  devOptions: {
    openUrl: '/examples/',
  },
  plugins: ['@snowpack/plugin-typescript'],
  optimize: {
    entrypoints: ['src/index.ts'],
    bundle: true,
    sourcemap: true,
    minify: true,
    target: 'es2018',
  },
  buildOptions: {
    out: 'dist/',
  },
};
