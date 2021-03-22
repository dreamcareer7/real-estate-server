const Orm  = {
  ...require('../../../../../Orm/index'),
  ...require('../../../../../Orm/context'),
}

const Contact = {
  ...require('../../../../../Contact/get'),
}

async function retrieveContacts(contactIds) {
  const associations = ['contact.attributes']

  Orm.setEnabledAssociations(associations)

  const models   = await Contact.getAll(contactIds)
  const contacts = await Orm.populate({ models, associations })

  return contacts
}


module.exports = {
  retrieveContacts
}
