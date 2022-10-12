const Contact = {
  ...require('../../../../../Contact/fast_filter'),
  ...require('../../../../../Contact/get'),
}


const getAssociationsMap = async function (credential, confirmed) {
  // find associations to create associationsMap
  const emails   = confirmed.filter(event => { if (event.attendees) return true }).flatMap(event => event.attendees.map(attendee => { if (attendee.emailAddress && attendee.emailAddress.address) return attendee.emailAddress.address }))
  const {ids}    = await Contact.fastFilter(credential.brand, credential.user, [{ attribute_type: 'email', value: emails, operator: 'any' }], {})
  const contacts = await Contact.getAll(ids)

  /*
    const contactsMap = {
      'a@rechat.com': c1,
      'b@rechat.com': c2,
      'c@rechat.com': null
    }

    Its possible that there are'nt few attendes(contact) in rechat
  */
  const contactsMap = {}
  for (const email of emails) {
    const c = contacts.find(contact => (contact.emails && contact.emails.includes(email)))
    if (c) contactsMap[email] = c.id
  }

  /*
    const associationsMap = {
      event_id_1: [{ contact: c1.id, association_type: 'contact' }],
      event_id_2: [{ contact: c2.id, association_type: 'contact' }],
    }
  */
  const associationsMap = {}
  for (const event of confirmed.filter(event => { if (event.attendees) return true })) {
    associationsMap[event.id] = event.attendees.filter(attendee => { if ( attendee.emailAddress && attendee.emailAddress.address && contactsMap[attendee.emailAddress.address]) return true }).map(attendee => {
      return {
        association_type: 'contact',
        contact: contactsMap[attendee.emailAddress.address]
      }
    })
  }

  return associationsMap
}


module.exports = {
  getAssociationsMap
}
