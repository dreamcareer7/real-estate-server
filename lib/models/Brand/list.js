const db = require('../../utils/db')
const Orm = require('../Orm')

class BrandList {
  /**
   * @param {UUID[]} ids 
   * @returns {Promise<IBrandList[]>}
   */
  async getAll(ids) {
    return db.select('brand/list/get', [ids])
  }

  /**
   * Get list templates by brand
   * @param {UUID} brand 
   * @returns {Promise<IBrandList[]>}
   */
  async getForBrand(brand) {
    const ids = await db.selectIds('brand/list/for_brand', [brand])
    return this.getAll(ids)
  }

  /**
   * @param {UUID=} brand_id
   * @param {IBrandListInput[]} lists 
   */
  async createAll(brand_id, lists) {
    return db.selectIds('brand/list/create', [
      brand_id,
      JSON.stringify(lists)
    ])
  }
}

const Model = new BrandList()

Orm.register('brand_list', 'BrandList', Model)

module.exports = Model
