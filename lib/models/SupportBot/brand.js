const sql = require('./sql')

async function getBrandsForUser(email) {
  return sql.select('SELECT * FROM get_brands_for_user($1)', [email])
}

async function getOfficeBrands() {
  return sql.select(`
    SELECT
      id,
      parent,
      name,
      messages->>'office_title' AS branch_title
    FROM
      brands
    WHERE
      messages ? 'office_title'
  `, [])
}

module.exports = {
  getBrandsForUser,
  getOfficeBrands
}