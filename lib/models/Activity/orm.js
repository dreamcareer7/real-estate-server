const Orm = require('../Orm/registry')

const { getAll } = require('./get')
const { publicize } = require('./publicize')

const associations = {
  object: {
    optional: true,
    model: (a, cb) => cb(null, a.object_class),
    id: (a, cb) => cb(null, a.object)
  }
}

Orm.register('activity', 'Activity', {
  getAll,
  publicize,
  associations
})
