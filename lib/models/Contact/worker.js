const start_import = require('./import')

module.exports = {
  import: function(job, done) {
    start_import(job).nodeify(done)
  }
}