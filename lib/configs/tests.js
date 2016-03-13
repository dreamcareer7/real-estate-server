var config = require('./development.js');
config.redis = {
  url:'redis://localhost:6379/1'
}
module.exports = config;