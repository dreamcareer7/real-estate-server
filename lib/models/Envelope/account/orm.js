const Orm = require('../../Orm/registry')

const { getAll } = require('./get')

Orm.register('docusign_account', 'DocusignAccount', {
  getAll
})
