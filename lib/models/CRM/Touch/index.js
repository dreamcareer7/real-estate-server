const _ = require('lodash')
const squel = require('squel').useFlavour('postgres')

const db = require('../../../utils/db.js')
const promisify = require('../../../utils/promisify')
const validator = require('../../../utils/validator.js')
const belt = require('../../../utils/belt')

const AssociationsHelper = require('../Association/helper')
const CrmAssociation = require('../Association')
const Orm = require('../../Orm')

const expect = validator.expect
const { touchSchema: schema, getAllOptionsSchema } = require('./schemas.js')

const associations = {
  associations: {
    enabled: false,
    collection: true,
    model: 'CrmAssociation'
  },

  created_by: {
    enabled: false,
    model: 'User'
  },

  files: {
    collection: true,
    enabled: false,
    model: 'AttachedFile'
  }
}

const validateOptions = validator.promise.bind(null, getAllOptionsSchema)

class Touch {
  /**
   * 
   * @param {UUID} touch_id 
   */
  async updateTouchTimes(touch_id) {
    await db.selectIds('crm/touch/update_touch_times_for_contacts', [
      touch_id
    ])
  }

  /**
   * Validates Touch object
   * @param {ITouchInput} object Input Touch object
   */
  async validate(object) {
    await validator.promise(schema, object)

    if (object.associations) {
      for (const assoc of object.associations) {
        await CrmAssociation.validate(assoc)
      }
    }
  }

  /**
   * Performs access control for the user on a number of touch ids
   * @param {UUID} user_id User id requesting access
   * @param {TAccessActions} op Action the user is trying to perform
   * @param {UUID[]} ids Touch ids to perform access control
   * @returns {Promise<Map<UUID, boolean>>}
   */
  async hasAccess(user_id, op, ids) {
    expect(ids).to.be.an('array')
    
    const access = op === 'read' ? 'read' : 'write'
    const rows = await db.select('crm/touch/has_access', [
      Array.from(new Set(ids)),
      user_id
    ])

    const foundIndex = _.keyBy(rows, 'id')

    const accessIndex = ids.reduce((index, tid) => {
      return index.set(tid, foundIndex.hasOwnProperty(tid) && foundIndex[tid][access])
    }, new Map)

    return accessIndex
  }

  /**
   * Get a touch log by id
   * @param {UUID} id Touch id to fetch
   */
  async get(id) {
    const result = await this.getAll([id])

    if (!result || result.length < 1) {
      throw Error.ResourceNotFound(`Touch ${id} not found`)
    }

    return result[0]
  }

  /**
   * Get multiple touches by id
   * @param {UUID[] | undefined} ids Array of touch ids to fetch
   * @param {boolean} skip_associations Skip fetching associations
   * @returns {Promise<ITouch[]>}
   */
  async getAll(ids, skip_associations = false) {
    const rows = await db.select('crm/touch/get', [
      ids
    ])

    if (!skip_associations) {
      const association_ids = _.flatMap(rows, t => t.associations)
      const associations_index = await this.Associations.getAllCategorizedByType(association_ids)

      for (const row of rows) {
        Object.assign(row, associations_index.get(row.id))
      }
    }

    return rows
  }

  /**
   * Get all touches created by user
   * @param {UUID} user_id Id of the user requesting this data
   * @param {ITouchFilters & PaginationOptions} options filter and pagination options
   * @returns {Promise<ITouch[]>}
   */
  async getForUser(user_id, options) {
    const result = await this.filter(user_id, options)
    const touches = await this.getAll(result.ids)

    if (touches.length === 0)
      return []

    touches[0].total = result.total
    return touches
  }

  /**
   * Paginate, sort and filter touches by various options.
   * @param {UUID} user_id User id requesting touches
   * @param {ITouchFilters & PaginationOptions} options filter and pagination options
   * @returns {Promise<IIdCollectionResponse>}
   */
  async filter(user_id, options) {
    await validateOptions(options)

    const q = squel.select()
      .field('id')
      .field('COUNT(*) OVER()::INT', 'total')
      .from('touches')
      .where('deleted_at IS NULL')
      .where('check_touch_read_access(touches, ?)', user_id)

    CrmAssociation.associationQuery(q, 'touch', options)

    if (options.activity_type)
      q.where('activity_type = ?', options.activity_type)
      
    if (Array.isArray(options.q)) {
      const q_expr = squel.expr()
      for (const term of options.q) {
        q_expr.and('description ILIKE ?', '%' + term + '%')
      }
      q.where(q_expr)
    }

    if (options.timestamp_gte)
      q.where('timestamp >= to_timestamp(?)', options.timestamp_gte)

    if (options.timestamp_lte)
      q.where('timestamp <= to_timestamp(?)', options.timestamp_lte)
    
    if (options.order) {
      if ('+-'.indexOf(options.order[0]) > -1)
        q.order(options.order.substring(1), options.order[0] !== '-')
      else
        q.order(options.order)
    }

    if (options.start)
      q.offset(options.start)

    if (options.limit)
      q.limit(options.limit)

    const builtQuery = q.toParam()
    const res = await promisify(db.executeSql)(builtQuery.text, builtQuery.values)

    if (res.rows.length === 0)
      return {
        ids: [],
        total: 0
      }

    return {
      ids: res.rows.map(r => r.id),
      total: res.rows[0].total
    }
  }

  /**
   * Create a touch
   * @param {ITouchInput} touch Touch object to be created
   * @param {UUID} user_id Creator of the touch log
   * @param {UUID?} brand_id Brand of the user
   * @returns {Promise<ITouch>}
   */
  async create(touch, user_id, brand_id) {
    await this.validate(touch)

    const timestamp = belt.epochToDate(touch.timestamp)

    const id = await db.insert('crm/touch/insert', [
      user_id,
      brand_id,
      touch.description,
      timestamp,
      touch.activity_type,
      touch.outcome
    ])

    if (Array.isArray(touch.associations)) {
      await this.Associations.createMany(touch.associations, id)
    }

    await this.updateTouchTimes(id)

    return this.get(id)
  }

  /**
   * Deletes a touch by id.
   * @param {UUID} id Touch ID to remove
   */
  async remove(id) {
    const res = await db.update('crm/touch/delete', [
      id,
    ])

    await this.updateTouchTimes(id)

    return res
  }

  /**
   * Updates a touch
   * @param {UUID} id Id of the touch to be updated
   * @param {ITouchInput} touch Touch object to replace the old data
   * @returns {Promise<ITouch>}
   */
  async update(id, touch) {
    await this.validate(touch)

    const timestamp = belt.epochToDate(touch.timestamp)

    await db.update('crm/touch/update', [
      id,
      touch.description,
      timestamp,
      touch.activity_type,
      touch.outcome
    ])

    await this.updateTouchTimes(id)

    return this.get(id)
  }
}

Touch.prototype.associations = associations
Touch.prototype.Associations = AssociationsHelper('touch')

const Model = new Touch
Orm.register('touch', 'Touch', Model)
module.exports = Model
