const db = require('../../../utils/db')


const update = async (user_id, brand_id, key, value) => {
  return db.select('user/settings/update', [
    user_id,
    brand_id,
    key,
    JSON.stringify(value)
  ])
}


module.exports = {
  update
}