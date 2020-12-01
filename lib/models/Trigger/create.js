const db = require('../../utils/db')
const Context = require('../Context/index')

/**
 * @param {import('./trigger').ITriggerInput[]} triggers
 */
async function create(triggers) {
  return db.selectIds('trigger/create', [
    Context.getId(),
    JSON.stringify(triggers)
  ])
}

module.exports = {
  create,
}
