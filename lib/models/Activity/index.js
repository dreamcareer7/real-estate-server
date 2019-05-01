const { EventEmitter } = require('events')

const _ = require('lodash')
const async = require('async')
const pascal = require('to-pascal-case')
const snake = require('to-snake-case')

const db = require('../../utils/db')
const render = require('../../utils/render').html
const validator = require('../../utils/validator')

const Context = require('../Context')
const Orm = require('../Orm')

const expect = validator.expect
const emitter = new EventEmitter

const Activity = {}
global['Activity'] = Activity

const schema = require('./schema')
const activity_reporting = require('./defs')

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

Activity.parse = function (activity, cb) {
  expect(activity).to.be.a('object')
  expect(activity.action).to.be.a('string')
  expect(activity.object_class).to.be.a('string')

  const activity_class = pascal(activity.object_class)
  const activity_data = activity.object

  expect(activity_class).to.be.a('string')

  async.auto({
    model: cb => {
      const model = Orm.getModelFromType(activity.object_class)
      if(!model)
        return cb()

      if (typeof activity_data === 'string') {
        Orm.getAll(model, [activity_data]).nodeify((err, results) => {
          if(err)
            return cb(err)

          if (results.length < 1)
            return cb(Error.ResourceNotFound(`${activity_class} ${activity_data} not found`))

          return cb(null, {
            payload: results[0],
            type: model
          })
        })
      } else {
        return cb(null, {
          payload: activity_data,
          type: model
        })
      }
    },
    standalone: cb => {
      if(Orm.getModelFromType(activity.object_class))
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

const enqueueIntercomReport = (event, metadata) => {
  const action = activity_reporting[event].intercom
  if (action) {
    if (!Array.isArray(Context.get('intercom')))
      Context.set({
        intercom: []
      })

    Context.get('intercom').push(Object.assign({
      event: action,
      timestamp: Date.now(),
    }, metadata))
  }
}

Activity.add = function(reference_id, reference_type, activity, cb) {
  expect(activity).to.be.a('object')

  async.auto({
    validate: cb => {
      validate(activity, cb)
    },
    reference_check: [
      'validate',
      cb => {
        const get_cb = (err, res) => {
          if (err) {
            return cb(Error.Validation('Activity reference not found.'))
          }

          if (Array.isArray(res)) {
            return cb(null, res[0])
          }

          return cb(Error.Validation('Activity reference not found.'))
        }
        if (reference_type === 'Contact')
          return Orm.getAll('Contact', [reference_id]).nodeify(get_cb)
        if (reference_type === 'User')
          return Orm.getAll('User', [reference_id]).nodeify(get_cb)
        if (reference_type === 'DealRole')
          return Orm.getAll('DealRole', [reference_id]).nodeify(get_cb)

        return cb(Error.Validation('Activity reference type must be User, Contact or DealRole'))
      }
    ],
    parse: [
      'validate',
      'reference_check',
      cb => {
        return Activity.parse(activity, cb)
      }
    ],
    record: [
      'validate',
      'reference_check',
      'parse',
      (cb, results) => {
        const [object, object_class, action] = results.parse

        db.query('activity/record', [
          reference_id,
          reference_type,
          object_class ? object.id : null,
          object_class,
          object_class ? null : object,
          action,
          Boolean(activity_reporting[action].timeline)
        ], (err, results) => {
          if(err)
            return cb(err)

          return cb(null, results.rows[0].id)
        })
      }
    ],
    get: [
      'parse',
      'record',
      (cb, results) => {
        Activity.get(results.record, cb)
      }
    ]
  }, (err, results) => {
    if(err)
      return cb(err)

    const [,, action] = results.parse
    emitter.emit(action, results.get)

    const metadata = {}
    if (reference_type === 'User')
      metadata.user = results.reference_check

    enqueueIntercomReport(action, metadata)

    return cb(null, results.get)
  })
}

Activity.templateFile = a => snake(a.action)

Activity.formatForDisplay = function(activity, data, cb) {
  const c = activity.object_class ? activity.object_class : activity.object_sa.type
  const a = _.cloneDeep(activity)

  Activity.publicize(a)
  a.data = data

  const template = __dirname + '/../../templates/activities/' +
                   snake(c) + '/' +
                   Activity.templateFile(a) + '.tmpl'

  render(template, a, (err, message) => {
    if(err)
      return cb(err)

    return cb(null, message.replace(/\n/g, '').trim())
  })
}

Activity.on = emitter.on.bind(emitter)

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

Orm.register('activity', 'Activity', Activity)

module.exports = Activity
