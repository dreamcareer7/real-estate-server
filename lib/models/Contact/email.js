const sq = require('../../utils/squel_extensions')
const db = require('../../utils/db.js')

class ContactEmail {
  /**
   * @param {IContactEmail[]} contact_emails 
   */
  static async createAll(contact_emails) {
    if (contact_emails.length > 0) {
      const q = sq.insert({ autoQuoteFieldNames: true, nameQuoteCharacter: '"' })
        .into('crm_emails')
        .setFieldsRows(contact_emails)

      // @ts-ignore
      q.name = 'contact/email/create_all'

      return db.query.promise(q, [])
    }
  }
}

module.exports = ContactEmail
