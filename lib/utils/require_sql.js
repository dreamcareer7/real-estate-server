var fs = require('fs');

require.extensions['.sql'] = function (module, filename) {
    module.exports = fs.readFileSync(filename, 'utf8');
};
