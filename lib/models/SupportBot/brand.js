const sql = require('../../utils/sql')

async function getBrandsForEmail(email) {
  return sql.selectWithError('SELECT * FROM get_brands_for_user($1)', [email])
}

async function getBrandsForUser(user_id) {
  return sql.selectWithError('SELECT * FROM get_brands_for_user($1::uuid)', [user_id])
}

async function getCRMBrandsForUser(user_id) {
  return sql.selectWithError(`
    SELECT DISTINCT
      b.id,
      b.name
    FROM
      brands b
      JOIN brands_roles br
        ON b.id = br.brand
      JOIN brands_users bu
        ON bu.role = br.id
    WHERE
      br.deleted_at IS NULL
      AND b.deleted_at IS NULL
      AND acl && ARRAY['CRM']
      AND bu."user" = $1
      AND bu.deleted_at IS NULL
  `, [ user_id ])
}

async function getOfficeBrands() {
  return sql.selectWithError(`
    SELECT
      id,
      parent,
      name,
      messages->>'branch_title' AS branch_title
    FROM
      brands
    WHERE
      messages ? 'branch_title'
  `, [])
}

module.exports = {
  getBrandsForEmail,
  getBrandsForUser,
  getOfficeBrands,
  getCRMBrandsForUser
}
