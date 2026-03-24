// Webpack loader that returns an empty CommonJS module.
// Used to stub out Node.js-only packages (e.g. undici) in browser / RSC builds.
module.exports = function emptyLoader() {
  return 'module.exports = {};';
};
