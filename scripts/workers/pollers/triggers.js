const Trigger = require('../../../lib/models/Trigger/due')
const { poll } = require('../poll')
require('./entrypoint')

poll({
  fn: Trigger.executeDue,
  name: 'Trigger.executeDue'
})
