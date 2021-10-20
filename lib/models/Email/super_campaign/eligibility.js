const db = require('../../../utils/db')
const sql = require('../../../utils/sql')

/**
 * @param {UUID} super_campaign 
 * @param {UUID[]} brands_to_delete 
 * @param {UUID[]} brands_to_insert
 */
async function updateEligibility(super_campaign, brands_to_delete, brands_to_insert) {
  await updateEnrollments(super_campaign, brands_to_delete, brands_to_insert)

  return db.query.promise('email/super_campaign/update_eligibility', [
    super_campaign,
    brands_to_delete,
    brands_to_insert,
  ])

  /**
   * We also need to update enrollments here:
   *   1. First we decide which eligible brands are to be deleted, and which ones are to be added.
   *   2. Then we delete enrolled (brand, user, tag)s that haven't been pinned by the admin.
   *   3. Then we add new enrollment records for newly added brands with users that have allowed admin to send campaigns on their behalf for the desired tags.
   */
}

/**
 * @param {UUID} super_campaign
 * @param {UUID[]} brands_to_delete
 * @param {UUID[]} brands_to_insert
 */
async function updateEnrollments(super_campaign, brands_to_delete, brands_to_insert) {
//   console.log(await sql.select(`SELECT
//   c.id AS super_campaign,
//   t.brand,
//   t.user,
//   array_agg(t.tag)
// FROM
//   super_campaigns AS c
//   CROSS JOIN unnest($2::uuid[]) AS e(brand)
//   CROSS JOIN LATERAL brand_valid_children(e.brand) AS bc(brand)
//   JOIN brands_roles AS br
//     ON bc.brand = br.brand
//   JOIN brands_users AS bu
//     ON br.id = bu."role"
//   JOIN super_campaigns_allowed_tags AS t
//     ON t.brand = bc.brand AND t.user = bu.user
// WHERE
//   c.id = $1::uuid
//   AND br.deleted_at IS NULL
//   AND bu.deleted_at IS NULL
//   AND t.tag = ANY(c.tags)
// GROUP BY
//   c.id,
//   t.brand,
//   t.user
// `, [ super_campaign, brands_to_insert ]))

  // console.log(await sql.select(`SELECT c.id as super_campaign, brands.id as brand, brands.name FROM super_campaigns AS c cross join unnest($2::uuid[]) as b(id) cross join lateral brand_valid_children(b.id) as bc(id) join brands on brands.id = bc.id WHERE c.id = $1::uuid`, [ super_campaign, brands_to_insert ]))

  console.log(await sql.select(`SELECT * FROM super_campaigns_allowed_tags`, []))

  return db.query.promise('email/super_campaign/enrollment/update', [
    super_campaign,
    brands_to_delete,
    brands_to_insert,
  ])  
}

module.exports = {
  updateEligibility
}
