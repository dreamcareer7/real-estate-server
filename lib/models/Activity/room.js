const _ = require('lodash')
const async = require('async')

const Message = require('../Message')
const ObjectUtil = require('../ObjectUtil')
const Orm = require('../Orm')
const Room = require('../Room')

const Activity = require('./index')

/**
 * @param {{ room_id: UUID; activity: any; user_id?: UUID; deal_role?: UUID; push?: boolean; set_author?: boolean }} arg1
 */
function postToRoom({ room_id, activity, user_id, deal_role, push = false, set_author = true }, cb) {
  /*
   * Each activity has a reference which could be a User, Contact or DealRole.
   * If you provide deal_role, it will be used.
   *
   * Otherwise you need to provide user_id (Or the method will assume current user)
   *
   * Contact's are not supported yet as we haven't had a usecase.
   */

  if (!user_id) user_id = ObjectUtil.getCurrentUser()

  const reference_type = deal_role ? 'DealRole' : 'User'
  const reference_id = deal_role ? deal_role : user_id

  async.auto(
    {
      room: cb => {
        Room.get(room_id, cb)
      },
      reference: cb => {
        (async () => {
          const res = await Orm.getAll(reference_type, [reference_id])

          if (res.length < 1) {
            throw Error.ResourceNotFound(`Activity reference ${reference_type}:${reference_id} not found.`)
          }

          return res[0]
        })().nodeify(cb)
      },
      create: [
        'room',
        (cb, results) => {
          if (deal_role) return Activity.add(deal_role, 'DealRole', activity, cb)

          Activity.add(user_id, 'User', activity, cb)
        }
      ],
      parse: [
        'room',
        'reference',
        'create',
        (cb, results) => {
          return Activity.parse(activity).nodeify((err, p) => {
            if (err) return cb(err)

            const [object, ,] = p
            const a = _.cloneDeep(results.create)
            a.object = object

            return cb(null, a)
          })
        }
      ],
      message: [
        'room',
        'reference',
        'create',
        'parse',
        (cb, results) => {
          Activity.formatForDisplay(results.parse, results.reference, cb)
        }
      ],
      post: [
        'create',
        'message',
        (cb, results) => {
          const message = {
            comment: results.message,
            activity: results.create.id,
            author: set_author ? user_id : undefined
          }

          Message.post(room_id, message, push, cb)
        }
      ]
    },
    (err, results) => {
      if (err) return cb(err)

      return cb(null, results.create)
    }
  )
}

module.exports = {
  postToRoom
}
