const fs = require('fs')

// Dirty and helpful hack to require HTML files as string to supply as
// parameters.
require.extensions['.html'] = function (module, filename) {
  module.exports = fs.readFileSync(filename, 'utf8')
}
