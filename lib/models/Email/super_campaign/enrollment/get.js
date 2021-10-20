const db  = require('../../../../utils/db')

/**
 * @param {UUID[]} ids
 * @returns {Promise<import('../types').SuperCampaignEnrollment[]>}
 */
async function getAll(ids) {
  return db.select('email/super_campaign/enrollment/get', [ids])
}

/**
 * @param {UUID} id
 * @returns {Promise<import('../types').SuperCampaignEnrollment>}
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

module.exports = {
  getAll,
  get,
  filterBySuperCampaign,
}
