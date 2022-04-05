const Orm = require('../Orm/registry')

const { getAll } = require('./get')


Orm.register('office', 'Office', {
  getAll,
  associations: {
    broker: {
      enabled: false,
      optional: true,
      model: 'Agent'
    }
  }
})
