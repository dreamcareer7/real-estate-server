const _ = require('lodash')

const db = require('../../../utils/db')
const validator = require('../../../utils/validator.js')
const expect = validator.expect
const Context = require('../../Context')

const BrandFlowStep = require('../flow_step')

const { get, getAll } = require('./get')



/**
 * Performs access control for the brand on a number of contact ids
 * @param {UUID} brand_id Brand id requesting access
 * @param {TAccessActions} op Action the user is trying to perform
 * @param {UUID[]} flow_ids Contact ids to perform access control
 * @returns {Promise<Map<UUID, boolean>>}
 */
const hasAccess = async (brand_id, op, flow_ids) =>{
  expect(flow_ids).to.be.an('array')

  const access = op === 'read' ? 'read' : 'write'
  const rows = await db.select('brand/flow/has_access', [
    Array.from(new Set(flow_ids)),
    brand_id
  ])

  const foundIndex = _.keyBy(rows, 'id')

  const accessIndex = flow_ids.reduce((index, tid) => {
    return index.set(
      tid,
      foundIndex.hasOwnProperty(tid) && foundIndex[tid][access]
    )
  }, new Map())

  return accessIndex
}

/**
 * @param {UUID} brand_id 
 */
const forBrand = async (brand_id) =>{
  const ids = await db.selectIds('brand/flow/for_brand', [brand_id])

  return getAll(ids)
}

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
  hasAccess,
  forBrand,
  update,
  delete: deleteByUser
}
