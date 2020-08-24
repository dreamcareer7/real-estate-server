const Orm = require('../../Orm/registry')

const { getAll } = require('./get')


Orm.register('google_mail_label', 'GoogleMailLabel', {
  getAll
})