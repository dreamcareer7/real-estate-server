const db = require('../../../utils/db')
const Context = require('../../Context')

const BrandFlowStep = require('../flow_step')
const { get } = require('./get')

/**
 * @param {UUID} user_id 
 * @param {UUID} flow_id 
 * @param {IBrandFlowInput} flow 
 */
const update = async (user_id, flow_id, flow) =>{
  return db.update('brand/flow/update', [
    user_id,
    Context.getId(),
    flow_id,
    flow.name,
    flow.description
  ])
}

const deleteByUser = async (user_id, flow_id) =>{
  const flow = await get(flow_id)

  // FIXME: Need to stop flows automatically instead
  if (flow.active_flows > 0) throw Error.Conflict(`This BrandFlow has ${flow.active_flows} active flows.`)

  await BrandFlowStep.deleteMany(user_id, flow_id, flow.steps)

  return db.update('brand/flow/delete', [
    user_id,
    Context.getId(),
    flow_id
  ])
}

module.exports = {
  update,
  deleteByUser,
}
