const Orm = require('../../Orm/registry')

const { getAll } = require('./get')


const associations = {
  messages: {
    collection: true,
    polymorphic: true,
    enabled: false
  },
  contacts: {
    collection: true,
    model: 'Contact',
    enabled: false
  }
}

Orm.register('email_thread', 'EmailThread', {
  getAll,
  associations
})