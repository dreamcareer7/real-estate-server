const _ = require('lodash')

const db = require('../../../utils/db')
const validator = require('../../../utils/validator.js')
const expect = validator.expect

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

module.exports = {
  hasAccess
}
