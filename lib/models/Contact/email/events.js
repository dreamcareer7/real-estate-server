const _ = require('lodash')
const Attribute = require('../attribute/emitter')
const Contact = require('../emitter')

const { update_contact_emails } = require('../worker/email')

/**
 * @param {{ attributes: IContactAttribute[] }} param0
 */
function onEmailAttributeManipulated({ attributes }) {
  const contacts = _.uniq(attributes.map(a => a.contact))
  update_contact_emails(contacts)
}

function onContactsDeleted({ event_type, contact_ids }) {
  update_contact_emails(contact_ids)
}

function onUpdateContactsBrand({ brand_id, contact_ids }) {
  update_contact_emails(contact_ids)
}

module.exports = function attachEventHandlers() {
  Attribute.on('create:email', onEmailAttributeManipulated)
  Attribute.on('update:email', onEmailAttributeManipulated)
  Attribute.on('delete:email', onEmailAttributeManipulated)

  Contact.on('delete', onContactsDeleted)
  Contact.on('update:brand', onUpdateContactsBrand)
}
