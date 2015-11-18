var fs = require('fs');

// Dirty and helpful hack to require text files as string to supply as
// parameters.
require.extensions['.asc'] = function (module, filename) {
  module.exports = fs.readFileSync(filename, 'utf8');
};
