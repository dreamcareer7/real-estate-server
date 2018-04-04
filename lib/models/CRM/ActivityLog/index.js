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
const { activitySchema: schema, getAllOptionsSchema } = require('./schemas.js')

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

class ActivityLog {
  /**
   * Validates ActivityLog object
   * @param {ICrmActivityInput} object Input ActivityLog object
   */
  static async validate(object) {
    await validator.promise(schema, object)

    if (object.associations) {
      for (const assoc of object.associations) {
        await CrmAssociation.validate(assoc)
      }
    }
  }

  /**
   * Performs access control for the user on a number of activity ids
   * @param {UUID} user_id User id requesting access
   * @param {TAccessActions} op Action the user is trying to perform
   * @param {UUID[]} ids Activity ids to perform access control
   * @returns {Promise<Map<UUID, boolean>>}
   */
  static async hasAccess(user_id, op, ids) {
    expect(ids).to.be.an('array')
    
    const access = op === 'read' ? 'read' : 'write'
    const rows = await db.select('crm/activity/has_access', [
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
   * Get an activity log by id
   * @param {UUID} id ActivityLog id to fetch
   */
  static async get(id) {
    const result = await ActivityLog.getAll([id])

    if (!result || result.length < 1) {
      throw Error.ResourceNotFound(`Activity log ${id} not found`)
    }

    return result[0]
  }

  /**
   * Get multiple activities by id
   * @param {UUID[] | undefined} ids Array of activity ids to fetch
   * @param {boolean} skip_associations Skip fetching associations
   * @returns {Promise<ICrmActivity[]>}
   */
  static async getAll(ids, skip_associations = false) {
    const rows = await db.select('crm/activity/get', [
      ids
    ])

    if (!skip_associations) {
      const association_ids = _.flatMap(rows, t => t.associations)
      const associations_index = await ActivityLog.Associations.getAllCategorized(association_ids)

      for (const row of rows) {
        Object.assign(row, associations_index.get(row.id))
      }
    }

    return rows
  }

  /**
   * Get all activities created by user
   * @param {UUID} user_id Id of the user requesting this data
   * @param {ICrmActivityFilters & PaginationOptions} options filter and pagination options
   * @returns {Promise<ICrmActivity[]>}
   */
  static async getForUser(user_id, options) {
    const result = await ActivityLog.filter(user_id, options)
    const activities = await ActivityLog.getAll(result.ids)

    if (activities.length === 0)
      return []

    activities[0].total = result.total
    return activities
  }

  /**
   * Paginate, sort and filter activities by various options.
   * @param {UUID} user_id User id requesting activities
   * @param {ICrmActivityFilters & PaginationOptions} options filter and pagination options
   * @returns {Promise<IIdCollectionResponse>}
   */
  static async filter(user_id, options) {
    await validateOptions(options)

    const q = squel.select()
      .field('id')
      .field('COUNT(*) OVER()::INT', 'total')
      .from('crm_activities')
      .where('deleted_at IS NULL')
      .where('check_crm_activity_read_access(crm_activities, ?)', user_id)

    CrmAssociation.associationQuery(q, 'crm_activity', options)

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
   * Create an activity log
   * @param {ICrmActivityInput} activity ActivityLog object to be created
   * @param {UUID} user_id Creator of the activity log
   * @param {UUID?} brand_id Brand of the user
   * @returns {Promise<ICrmActivity>}
   */
  static async create(activity, user_id, brand_id) {
    await ActivityLog.validate(activity)

    const timestamp = belt.epochToDate(activity.timestamp)

    const id = await db.insert('crm/activity/insert', [
      user_id,
      brand_id,
      activity.description,
      timestamp,
      activity.activity_type,
      activity.outcome
    ])

    if (Array.isArray(activity.associations)) {
      await ActivityLog.Associations.createMany(activity.associations, id)
    }

    return ActivityLog.get(id)
  }

  /**
   * Deletes an activity log by id.
   * @param {UUID} id ActivityLog ID to remove
   * @returns {Promise<any>}
   */
  static async remove(id) {
    return db.query.promise('crm/activity/delete', [
      id,
    ])
  }

  /**
   * Updates an activity log
   * @param {UUID} id Id of the activity to be updated
   * @param {ICrmActivityInput} activity ActivityLog object to replace the old data
   * @returns {Promise<ICrmActivity>}
   */
  static async update(id, activity) {
    await ActivityLog.validate(activity)

    const timestamp = belt.epochToDate(activity.timestamp)

    await db.query.promise('crm/activity/update', [
      id,
      activity.description,
      timestamp,
      activity.activity_type,
      activity.outcome
    ])

    return ActivityLog.get(id)
  }
}

ActivityLog.associations = associations
ActivityLog.Associations = AssociationsHelper('crm_activity')

Orm.register('crm_activity', 'CrmActivity', ActivityLog)
module.exports = ActivityLog
