const Daily = require('../../../lib/models/Daily')
const { poll } = require('../poll')
require('./entrypoint')

poll({
  fn: Daily.sendDue,
  name: 'Daily.sendDue'
})
