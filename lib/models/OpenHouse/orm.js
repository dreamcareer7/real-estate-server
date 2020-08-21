const Orm = require('../Orm/registry')

const { getAll } = require('./get')

Orm.register('open_house', 'OpenHouse', {
  getAll
})
