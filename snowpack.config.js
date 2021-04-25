module.exports = {
  mount: {
    src: { url: '/' },
    dist: { url: '/', static: true },
    examples: { url: '/examples', static: true },
  },
  devOptions: {
    openUrl: '/examples/',
  },
  plugins: [
    ['@snowpack/plugin-typescript', { args: '--emitDeclarationOnly false' }],
  ],
};
