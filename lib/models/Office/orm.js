const Orm = require('../Orm/registry')

const { getAll } = require('./get')


Orm.register('office', 'Office', {
  getAll,
  associations: {
    broker: {
      enabled: false,
      model: 'Agent'
    }
  }
})
