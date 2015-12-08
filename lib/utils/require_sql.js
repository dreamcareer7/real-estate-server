var fs = require('fs');

// Dirty and helpful hack to require SQL files as string to supply as
// parameters.
require.extensions['.sql'] = function (module, filename) {
  module.exports = fs.readFileSync(filename, 'utf8');
};
