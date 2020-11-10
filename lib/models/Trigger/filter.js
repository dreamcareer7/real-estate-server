const db = require('../../utils/db')
const sq = require('../../utils/squel_extensions')

/**
 * 
 * @param {*} params 
 */
async function filter(params) {
  const q = sq.select()
    .field('id')
    .from('flows')
    .where('brand = ?', brand)
}

module.exports = {
  filter,
}
