const db = require('../../utils/db')
const Context = require('../Context/index')

/**
 * @param {import('./trigger').ITriggerInput[]} triggers
 */
async function create(triggers) {
  require('../../utils/belt').footprint(arguments, null, 'Trigger.create')
  return db.selectIds('trigger/create', [
    Context.getId(),
    JSON.stringify(triggers)
  ])
}

module.exports = {
  create,
}
