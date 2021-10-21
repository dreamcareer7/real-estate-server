const db  = require('../../../../utils/db')

/** @typedef {import('../types').SuperCampaignEnrollment} SuperCampaignEnrollment */
/** @typedef {import('../types').SuperCampaignStored} SuperCampaignStored */

/**
 * @param {UUID[]} ids
 * @returns {Promise<SuperCampaignEnrollment[]>}
 */
async function getAll(ids) {
  return db.select('email/super_campaign/enrollment/get', [ids])
}

/**
 * @param {UUID} id
 * @returns {Promise<SuperCampaignEnrollment | null>}
 */
async function get(id) {
  const res = await getAll([id])

  if (res.length > 0) {
    return res[0]
  }

  return null
}

/**
 * @param {UUID} super_campaign
 * @param {PaginationOptions} options
 */
async function filterBySuperCampaign(super_campaign, options) {
  const res = await db.select('email/super_campaign/enrollment/for_super_campaign', [
    super_campaign,
    options.start,
    options.limit
  ])
  if (res.length === 0) {
    return []
  }

  const total = res[0].total
  const ids = res.map(r => r.id)

  const enrollments = await getAll(ids)
  enrollments[0].total = total

  return enrollments
}

/** 
 * @param {SuperCampaignStored['id']} superCampaignId 
 * @returns {Promise<SuperCampaignEnrollment[]>}
*/
async function getBySuperCampaign (superCampaignId) {
  const ids = await db.select(
    'email/super_campaign/enrollments/by_super_campaign',
    [superCampaignId]
  )

  return ids.length ? getAll(ids) : []
}

module.exports = {
  getAll,
  get,
  filterBySuperCampaign,
  getBySuperCampaign,
}
