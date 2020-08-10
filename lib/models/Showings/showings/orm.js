const Orm = require('../../Orm/registry')

const { getAll } = require('./get')


Orm.register('showings', 'Showings', {
  getAll
})