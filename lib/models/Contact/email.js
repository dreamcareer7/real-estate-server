const sq = require('../../utils/squel_extensions')
const db = require('../../utils/db.js')
const Email = require('../Email')

class ContactEmail {
  static async create({email, user}) {
    email.domain = Email.MARKETING
    const saved = await Email.create(email)

    await db.query.promise('contact/email/insert', [
      user.id,
      email.contact,
      saved.id,
    ])
  }

  static async createAll(emails, user) {
    for (const email of emails) {
      email.domain = Email.MARKETING
    }

    const ids = await Email.createAll(emails)
    const contact_emails = emails.filter(e => e.contact).map((email, i) => ({
      user: user.id,
      contact: email.contact,
      email: ids[i]
    }))

    if (contact_emails.length > 0) {
      const q = sq.insert({ autoQuoteFieldNames: true, nameQuoteCharacter: '"' })
        .into('crm_emails')
        .setFieldsRows(contact_emails)

      q.name = 'contact/email/create_all'

      return db.query.promise(q, [])
    }
  }
}

module.exports = ContactEmail
