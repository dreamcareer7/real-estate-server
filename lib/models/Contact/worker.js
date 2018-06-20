const {
  import_csv,
  import_json
} = require('./import')

module.exports = {
  import_csv(job, done) {
    import_csv(job).nodeify(done)
  },
  import_json(job, done) {
    import_json(job).nodeify(done)
  }
}