const Orm = require('../../Orm/registry')

const { getAll } = require('./showings')


Orm.register('showings', 'Showings', {
  getAll
})