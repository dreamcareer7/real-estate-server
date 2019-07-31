const _ = require('lodash')

const db = require('../../utils/db')
const validator = require('../../utils/validator.js')
const expect = validator.expect

const Context = require('../Context')
const Orm = require('../Orm')

const BrandFlowStep = require('./flow_step')

function getCurrentBrand() {
  const brand = Context.get('brand')

  if (brand) return brand.id
}

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
    return db.select('brand/flow/get', [
      ids,
      getCurrentBrand()
    ])
  }

  publicize(data) {
    const brand_id = getCurrentBrand()

    data.is_editable = (typeof brand_id === 'string' && brand_id.length === 36)
  }

  /**
   * Performs access control for the brand on a number of contact ids
   * @param {UUID} brand_id Brand id requesting access
   * @param {TAccessActions} op Action the user is trying to perform
   * @param {UUID[]} flow_ids Contact ids to perform access control
   * @returns {Promise<Map<UUID, boolean>>}
   */
  async hasAccess(brand_id, op, flow_ids) {
    expect(flow_ids).to.be.an('array')

    const access = op === 'read' ? 'read' : 'write'
    const rows = await db.select('brand/flow/has_access', [
      Array.from(new Set(flow_ids)),
      brand_id
    ])

    const foundIndex = _.keyBy(rows, 'id')

    const accessIndex = flow_ids.reduce((index, tid) => {
      return index.set(
        tid,
        foundIndex.hasOwnProperty(tid) && foundIndex[tid][access]
      )
    }, new Map())

    return accessIndex
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
      flow.description,
      Context.getId()
    ])

    await BrandFlowStep.createAll(user_id, brand_id, flow.steps.map(s => ({ ...s, flow: id })))

    return id
  }

  /**
   * @param {UUID} user_id 
   * @param {UUID} flow_id 
   * @param {IBrandFlowInput} flow 
   */
  async update(user_id, flow_id, flow) {
    return db.update('brand/flow/update', [
      user_id,
      Context.getId(),
      flow_id,
      flow.name,
      flow.description
    ])
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
