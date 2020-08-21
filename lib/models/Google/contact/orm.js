const Orm = require('../../Orm/registry')

const { getAll } = require('./get')


Orm.register('google_contact', 'GoogleContact', {
  getAll
})