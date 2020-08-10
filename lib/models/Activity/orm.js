const Orm = require('../Orm/registry')

const { getAll } = require('./get')

const publicize = function(model) {
  if(model.object_sa) {
    model.object = model.object_sa
  }

  delete model.object_class
  delete model.object_sa

  return model
}

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

module.exports = {
  publicize
}
