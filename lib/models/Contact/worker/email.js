const db = require('../../../utils/db')
const { peanar } = require('../../../utils/peanar')

/**
 * @param {UUID[]} contacts 
 */
async function update_contact_emails(contacts) {
  await db.update('contact/email/update', [ contacts ])
}

module.exports = {
  update_contact_emails: peanar.job({
    handler: update_contact_emails,
    exchange: 'contacts',
    queue: 'contacts',
    error_exchange: 'contact_duplicates.error'
  })
}
