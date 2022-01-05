const db = require('../../../utils/db')
const Context = require('../../Context')

/**
 * @param {import('./types').IFlowStepInput[]} steps 
 */
const create = async (steps) => {
  Context.log(`Creating ${steps.length} steps`)

  return db.selectIds('flow/step/create', [
    JSON.stringify(steps.map(({ flow, origin, created_by }) => ({ flow, origin, created_by })))
  ])
}

module.exports = {
  create,
}
