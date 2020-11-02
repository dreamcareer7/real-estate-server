const db = require('../../../utils/db')
const Context = require('../../Context')

const BrandFlowStep = require('../flow_step')

/**
 * @param {UUID} brand_id 
 * @param {UUID} user_id 
 * @param {IBrandFlowInput} flow 
 */
const create = async (brand_id, user_id, flow) =>{
  const id = await db.insert('brand/flow/create', [
    user_id,
    brand_id,
    flow.name,
    flow.description,
    Context.getId()
  ])

  await BrandFlowStep.createAll(user_id, brand_id, flow.steps.map(s => ({ ...s, flow: id })))

  return id
}

module.exports = {
  create,
}
