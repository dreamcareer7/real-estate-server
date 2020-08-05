const Orm = require('../../Orm/registry')

const { getAll } = require('./get')


Orm.register('microsoft_mail_folder', 'MicrosoftMailFolder', {
  getAll
})