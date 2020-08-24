const Orm = require('../../Orm/registry')

const { getAll } = require('./get')


Orm.register('microsoft_contact', 'MicrosoftContact', {
  getAll
})