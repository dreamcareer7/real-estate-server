const db = require('../../utils/db')
const Contact = require('../Contact')

async function deleteAllTags(brand_id, user_id) {
  const affected_contacts = await db.selectIds('contact/tag/support_delete_all', [
    user_id,
    brand_id
  ])

  Contact.emit('update', {
    user_id,
    brand_id,
    contact_ids: affected_contacts,
    event_type: 'tag'
  })
}

module.exports = {
  deleteAllTags
}
