const { combineHandlers } = require('../../utils/worker')

const {
  import_csv,
  import_json
} = require('./import')

const contact_data_pipeline = require('./data_pipeline')

module.exports = combineHandlers({
  contact_import: {
    import_csv,
    import_json,
  },
  contact_data_pipeline
})