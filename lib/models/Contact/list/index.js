const _ = require('lodash')

const db = require('../../../utils/db.js')
const validator = require('../../../utils/validator.js')
const expect = validator.expect
const emitter = require('./emitter')


/**
 * Performs access control for the brand on a number of list ids
 * @param {UUID} brand_id Brand id requesting access
 * @param {TAccessActions} op Action the user is trying to perform
 * @param {UUID[]} list_ids List ids to perform access control
 * @returns {Promise<Map<UUID, boolean>>}
 */
async function hasAccess(brand_id, op, list_ids) {
  expect(list_ids).to.be.an('array')

  const access = op === 'read' ? 'read' : 'write'
  const rows = await db.select('contact/list/has_access', [
    Array.from(new Set(list_ids)),
    brand_id
  ])

  const foundIndex = _.keyBy(rows, 'id')

  const accessIndex = list_ids.reduce((index, tid) => {
    return index.set(
      tid,
      foundIndex.hasOwnProperty(tid) && foundIndex[tid][access]
    )
  }, new Map())

  return accessIndex
}

module.exports = {
  hasAccess,
  ...require('./get'),
  ...require('./manipulate'),

  on: emitter.on.bind(emitter),
  once: emitter.once.bind(emitter),
}
