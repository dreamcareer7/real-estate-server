const db = require('../../utils/db')
const Orm = require('../Orm')

const BrandFlowStep = require('./flow_step')

class BrandFlow {
  async get(id) {
    const res = await this.getAll([id])

    if (res.length < 1) {
      throw Error.ResourceNotFound(`BrandFlow ${id} does not exist.`)
    }

    return res[0]
  }

  /**
   * @param {UUID[]} ids 
   * @returns {Promise<IBrandFlow[]>}
   */
  async getAll(ids) {
    return db.select('brand/flow/get', [ids])
  }

  /**
   * @param {UUID} brand_id 
   */
  async forBrand(brand_id) {
    const ids = await db.selectIds('brand/flow/for_brand', [brand_id])

    return this.getAll(ids)
  }

  /**
   * @param {UUID} brand_id 
   * @param {UUID} user_id 
   * @param {IBrandFlowInput} flow 
   */
  async create(brand_id, user_id, flow) {
    const id = await db.insert('brand/flow/create', [
      user_id,
      brand_id,
      flow.name,
      flow.description
    ])

    await BrandFlowStep.createAll(user_id, brand_id, flow.steps.map(s => ({ ...s, flow: id })))
  }
}

BrandFlow.prototype.associations = {
  steps: {
    model: 'BrandFlowStep',
    enabled: false,
    collection: true,
    optional: false
  }
}

const Model = new BrandFlow()

Orm.register('brand_flow', 'BrandFlow', Model)

module.exports = Model
