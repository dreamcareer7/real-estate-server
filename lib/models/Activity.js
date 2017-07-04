const validator = require('../utils/validator.js')
const expect = validator.expect
const _u = require('underscore')
const db = require('../utils/db.js')
const async = require('async')
const pascal = require('to-pascal-case')

Activity = {}

Orm.register('activity', 'Activity')

const schema = {
  type: 'object',
  properties: {
    action: {
      type: 'string',
      required: true,
      enum: [
        'UserViewedAlert',
        'UserViewedListing',
        'UserFavoritedListing',
        'UserSharedListing',
        'UserCreatedAlert',
        'UserCommentedRoom',
        'UserOpenedIOSApp',
        'UserCalledContact',
        'UserCreatedContact',
        'UserSignedUp',
        'UserInvited'
      ]
    }
  }
}

const validate = validator.bind(null, schema)

Activity.get = function(id, cb) {
  Activity.getAll([id], (err, activities) => {
    if(err)
      return cb(err)

    if(activities.length < 1)
      return cb(Error.ResourceNotFound(`Activity ${id} not found`))

    const activity = activities[0]

    return cb(null, activity)
  })
}

Activity.getAll = function(activity_ids, cb) {
  db.query('activity/get', [activity_ids], (err, res) => {
    if(err)
      return cb(err)

    const activities = res.rows

    return cb(null, activities)
  })
}

Activity.userTimeline = function(user_id, paging, cb) {
  expect(user_id).to.be.uuid

  async.auto({
    get: cb => {
      User.get(user_id, cb)
    },
    refs: [
      'get',
      (cb, results) => {
        const contact_refs = results.get.contacts || []
        let refs = [user_id].concat(contact_refs)
        refs = _u.unique(refs)

        return cb(null, refs)
      }
    ],
    timeline: [
      'get',
      'refs',
      (cb, results) => {
        db.query('activity/timeline', [
          results.refs,
          paging.type,
          paging.timestamp,
          paging.limit
        ], (err, results) => {
          if(err)
            return cb(err)

          const activity_ids = results.rows.map(r => r.id)

          Activity.getAll(activity_ids, (err, activities) => {
            if(err)
              return cb(err)

            if(results.rows.length > 0)
              activities[0].total = results.rows[0].total

            return cb(null, activities)
          })
        })

      }
    ]
  }, (err, results) => {
    if(err)
      return cb(err)

    return cb(null, results.timeline)
  })
}

Activity.contactTimeline = function(contact_id, paging, cb) {
  expect(contact_id).to.be.uuid

  async.auto({
    get: cb => {
      Contact.get(contact_id, cb)
    },
    refs: [
      'get',
      (cb, results) => {
        const user_refs = results.get.users
        const contact_refs = results.get.sub_contacts.map(r => {
          return r.id
        })

        let refs = [contact_id].concat(user_refs).concat(contact_refs)
        refs = _u.unique(refs)

        return cb(null, refs)
      }
    ],
    timeline: [
      'get',
      'refs',
      (cb, results) => {
        db.query('activity/timeline', [
          results.refs,
          paging.type,
          paging.timestamp,
          paging.limit
        ], (err, results) => {
          if(err)
            return cb(err)


          const activity_ids = results.rows.map(r => r.id)

          Activity.getAll(activity_ids, (err, activities) => {
            if(err)
              return cb(err)

            if(results.rows.length > 0)
              activities[0].total = results.rows[0].total

            return cb(null, activities)
          })
        })
      }
    ]
  }, (err, results) => {
    if(err)
      return cb(err)

    return cb(null, results.timeline)
  })
}

Activity.parse = function (activity, cb) {
  expect(activity).to.be.a('object')
  expect(activity.action).to.be.a('string')
  expect(activity.object_class).to.be.a('string')

  const activity_class = pascal(activity.object_class)
  const activity_data = activity.object

  expect(activity_class).to.be.a('string')

  async.auto({
    model: cb => {
      if(!global[activity_class])
        return cb()

      expect(activity_data).to.be.uuid
      ObjectUtil.dereference(activity_class, activity_data, (err, results) => {
        if(err)
          return cb(err)

        return cb(null, {
          payload: results,
          type: activity_class
        })
      }, true)
    },
    standalone: cb => {
      if(global[activity_class])
        return cb()

      expect(activity_data).to.be.a('object')
      expect(activity_data.type).to.be.a('string')

      const def = validator.types.activity[activity_data.type]

      expect(def).to.be.a('object')

      validator(def, activity_data, err => {
        if(err)
          return cb(err)

        return cb(null, {
          payload: activity_data,
          type: null
        })
      })
    }
  }, (err, results) => {
    if(err)
      return cb(err)

    const data = results.model || results.standalone || null
    if(!data)
      return cb(Error.Validation('Activity must either be a referenced model or a JSON object'))

    return cb(null, [data.payload, data.type, activity.action])
  })
}

Activity.add = function(reference_id, reference_type, activity, cb) {
  expect(activity).to.be.a('object')

  async.auto({
    validate: cb => {
      validate(activity, cb)
    },
    parse: cb => {
      return Activity.parse(activity, cb)
    },
    record: [
      'validate',
      'parse',
      (cb, results) => {
        const [object, object_class, action] = results.parse

        db.query('activity/record', [
          reference_id,
          reference_type,
          object_class ? object.id : null,
          object_class,
          object_class ? null : object,
          action
        ], (err, results) => {
          if(err)
            return cb(err)

          return cb(null, results.rows[0].id)
        })
      }
    ],
    get: [
      'record',
      (cb, results) => {
        Activity.get(results.record, cb)
      }
    ]
  }, (err, results) => {
    if(err)
      return cb(err)

    return cb(null, results.get)
  })
}

Activity.associations = {
  object: {
    optional: true,
    model: (a, cb) => cb(null, a.object_class),
    id: (a, cb) => cb(null, a.object)
  }
}

Activity.publicize = function(model) {
  if(model.object_sa) {
    model.object = model.object_sa
  }

  delete model.object_class
  delete model.object_sa

  return model
}
