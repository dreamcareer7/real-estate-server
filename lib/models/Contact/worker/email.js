const db = require('../../../utils/db')
const { peanar } = require('../../../utils/peanar')
const sq = require('../../../utils/squel_extensions')

/**
 * @param {UUID[]} contacts 
 */
async function update_contact_emails(contacts) {
  await db.update('contact/email/update', [ sq.SqArray.from(contacts) ])
}

module.exports = {
  update_contact_emails: peanar.job({
    handler: update_contact_emails,
    exchange: 'contacts',
    queue: 'contacts',
    error_exchange: 'contact_emails.error'
  })
}
