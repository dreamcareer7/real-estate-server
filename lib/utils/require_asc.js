var fs = require('fs');

require.extensions['.asc'] = function (module, filename) {
    module.exports = fs.readFileSync(filename, 'utf8');
};
