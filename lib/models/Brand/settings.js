const db = require('../../utils/db')
const Context = require('../Context')
const Orm = require('../Orm')

class BrandSettings {
  /**
   * @param {UUID} brand_id 
   */
  get(brand_id) {
    return db.select('brand/settings/get', [ brand_id ])
  }

  /**
   * @param {UUID} brand_id 
   * @param {string} key 
   * @param {any} value 
   * @param {UUID} user_id 
   */
  set(brand_id, key, value, user_id) {
    return db.update('brand/settings/set', [
      user_id,
      Context.getId(),
      brand_id,
      key,
      JSON.stringify(value)
    ])
  }
}

const Model = new BrandSettings
Orm.register('brand_settings', 'BrandSettings', BrandSettings)

module.exports = Model
