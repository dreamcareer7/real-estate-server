const db = require('../../utils/db')

/**
 * Get the list of enabled MLS's for the brand
 * @param {UUID} brand 
 */
function getForBrand(brand) {
  return db.map('brand/mls/for_brand', [brand], r => r.mls)
}

module.exports = {
  getForBrand
}
