const sq = require('../../../utils/squel_extensions')
const db = require('../../../utils/db')
const Context = require('../../Context')

/**
 * @param {import('./types').IFlowStepInput[]} steps 
 */
const create = async (steps) => {
  Context.log(`Creating ${steps.length} steps`)

  const q = sq.insert({ autoQuoteFieldNames: true })
    .into('flows_steps')
    .setFieldsRows(steps)
    .returning('id')

  // @ts-ignore
  q.name = 'flow/step/create'

  return db.selectIds(q, [])
}

module.exports = {
  create,
}
