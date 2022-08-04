const { combineHandlers } = require('../../../utils/worker')

const contacts = require('./contact')
const contact_import = require('./import')
const contact_lists = require('./list')
const contact_duplicates = require('./duplicate')
const contact_webhooks = require('./webhooks')

module.exports = combineHandlers({
  contacts,
  contact_import,
  contact_lists,
  contact_duplicates,
  contact_webhooks
})
