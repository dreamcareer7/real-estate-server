const Context = require('../../../../../Context')
const User = require('../../../../../User')
const Orm  = {
  ...require('../../../../../Orm/index'),
  ...require('../../../../../Orm/context'),
}

const Contact = {
  ...require('../../../../../Contact/get'),
}


async function retrieveContacts(credential, contactIds) {
  const associations = ['contact.attributes']

  const user = await User.get(credential.user)

  /* TODO: Seems we can safely remove this line: */
  Context.set({ user })
  Orm.setEnabledAssociations(associations)

  const models   = await Contact.getAll(contactIds)
  const contacts = await Orm.populate({ models, associations })

  return contacts
}


module.exports = {
  retrieveContacts
}
