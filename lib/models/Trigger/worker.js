const { peanar } = require('../../utils/peanar')
const { execute } = require('./execute')
const { deleteForContacts, contactsDeletedHandler } = require('./delete')

module.exports = {
  delete_for_contacts: peanar.job({
    handler: deleteForContacts,
    queue: 'trigger',
    error_exchange: 'trigger.error',
    retry_exchange: 'trigger.retry',
    retry_delay: 20000,
    max_retries: 10,
    exchange: 'trigger',
    name: 'delete_for_contacts'
  }),

  execute: peanar.job({
    handler: execute,
    queue: 'trigger',
    error_exchange: 'trigger.error',
    retry_exchange: 'trigger.retry',
    retry_delay: 20000,
    max_retries: 10,
    exchange: 'trigger',
    name: 'execute_trigger'
  }),

  contacts_deleted_handler: peanar.job({
    handler: contactsDeletedHandler,
    queue: 'trigger',
    error_exchange: 'trigger.error',
    retry_exchange: 'trigger.retry',
    retry_delay: 20000,
    max_retries: 10,
    exchange: 'trigger',
    name: 'contacts_deleted_handler'
  }),
}
