const validator = require('../utils/validator.js')
const expect = validator.expect
const _u = require('underscore')
const db = require('../utils/db.js')
const async = require('async')

Activity = {}

Orm.register('activity', Activity)

const schema = {
  type: 'object',
  properties: {

  }
}

const validate = validator.bind(null, schema)

Activity.get = function(id, cb) {
  db.query('activity/get', [id], (err, res) => {
    if(err)
      return cb(err)

    if(res.rows.length < 1)
      return cb(Error.ResourceNotFound(`Activity ${id} not found`))

    const activity = res.rows[0]

    return cb(null, activity)
  })
}

Activity.timeline = function(contact_id, paging, cb) {
  expect(contact_id).to.be.a.uuid

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

          async.map(activity_ids, Activity.get, (err, activities) => {
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
  expect(activity).not.to.be.null
  expect(activity.action).to.be.a('string')

  const activity_class = activity['object_class']
  const activity_data = activity['object']

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
      })
    },
    standalone: cb => {
      if(global[activity_class])
        return cb()

      expect(activity_data).to.be.a('object')
      expect(activity_data.type).to.be.a('string')

      return cb(null, {
        payload: activity_data,
        type: null
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
  subject: {
    optional: true,
    model: (n, cb) => cb(null, n.subject_class),
    id: (n, cb) => {
      if (n.subject_class === 'Room' || n.subject_class === 'Message')
        return cb()

      return cb(null, n.subject)
    }
  }
}

Activity.publicize = function(model) {
  if(model.subject_sa) {
    model.subject = model.subject_sa
  }

  delete model.subject_class
  delete model.subject_sa

  return model
}
