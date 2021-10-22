const isNil = require('lodash/isNil')
const db = require('../../../utils/db')

/** @typedef {import('./types').SuperCampaignStored} SuperCampaignStored */

/** @type {(msg: string) => Error} */
const dontRetry = msg => Object.assign(Error.Generic(msg), { retry: false })

/** @param {SuperCampaignStored['id']} id */
async function lock (id) {
  /** @type {Pick<SuperCampaignStored, 'id' | 'deleted_at' | 'executed_at'>} */
  const sc = await db.selectOne('email/super_campaign/lock', [id])

  if (!sc) {
    throw Error.Generic(`Lock not acquired for super campaign ${id}`)
  }

  if (!isNil(sc.deleted_at)) {
    throw dontRetry(`Super Campaign ${id} is deleted`)
  }

  if (!isNil(sc.executed_at)) {
    throw dontRetry(`Super Campaign ${id} already executed`)
  }
}

module.exports = { lock }
