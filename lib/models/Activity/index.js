const { EventEmitter } = require('events')

const Orm = require('../Orm')

const emitter = new EventEmitter

const Activity = {
  ...require('./add'),
  ...require('./get'),
  ...require('./publicize')
}

Activity.on = emitter.on.bind(emitter)

Activity.associations = {
  object: {
    optional: true,
    model: (a, cb) => cb(null, a.object_class),
    id: (a, cb) => cb(null, a.object)
  }
}

Orm.register('activity', 'Activity', Activity)

module.exports = Activity
