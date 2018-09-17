const db = require('../../utils/db.js')

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
}

module.exports = ContactEmail
