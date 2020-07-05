const Orm = require('../Orm')

const Activity = {
  ...require('./add'),
  ...require('./get'),
  ...require('./publicize')
}

Activity.associations = {
  object: {
    optional: true,
    model: (a, cb) => cb(null, a.object_class),
    id: (a, cb) => cb(null, a.object)
  }
}

Orm.register('activity', 'Activity', Activity)

module.exports = Activity
