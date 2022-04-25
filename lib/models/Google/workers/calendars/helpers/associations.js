const Contact = {
  ...require('../../../../Contact/fast_filter'),
  ...require('../../../../Contact/get'),
  ...require('../../../../Contact/manipulate'),
}

const config = require('../../../../../config')
const _REASON = config.google_integration.google_calendar_attendee_reason

const getAssociationsMap = async function (credential, confirmed) {
  // find associations to create associationsMap
  let emails = confirmed.filter(event => { if (event.attendees) return true }).flatMap(event => event.attendees.map(({email}) => email))
  emails = [...new Set(emails)] // Remove duplicate emails
  const index = emails.indexOf(credential.email)
  if (index > -1) {
    emails.splice(index, 1) // Remove the event owner email (credential email) form emails list
  }
  const {ids: idsDeleted}    = await Contact.fastFilter(credential.brand, [{ attribute_type: 'email', value: emails, operator: 'any' }], { deleted_gte: 1})
  const contactsDeleted = await Contact.getAll(idsDeleted)

  const {ids}    = await Contact.fastFilter(credential.brand, [{ attribute_type: 'email', value: emails, operator: 'any' }], { })
  const contacts = await Contact.getAll(ids)

  /*
    const contactsMap = {
      'a@rechat.com': c1,
      'b@rechat.com': c2,
      'c@rechat.com': null
    }

    Its possible that there are'nt few attendes(contact) in rechat
  */
  const newContactEmails = []
  const contactsMap = {}
  for (const email of emails) {
    const c = contacts.find(contact => (contact.emails && contact.emails.includes(email)))
    if (c) { 
      contactsMap[email] = c.id
    } else if( !contactsDeleted.find(contact => (contact.emails && contact.emails.includes(email))) ) {
      newContactEmails.push(email)
    }
  }

  if (newContactEmails.length > 0) {
    

    const contactsIds = await Contact.create(newContactEmails.map(contactEmail => { 
      return {
        user: credential.user,
        attributes: [{ attribute_type: 'source_type', text: 'Google' }, { attribute_type: 'email', text: contactEmail }],
        parked: true
      }
    }), credential.user, credential.brand, _REASON, { activity: false, get: false })
  
    for (let i = 0; i < contactsIds.length; i++) {
      contactsMap[newContactEmails[i]] = contactsIds[i]  
    }
  }
  /*
  contactsMap {
  'amindotb@gmail.com': '05882ef5-db23-4f17-8d99-ffededf77872',
  'amin.rechat@outlook.com': '042b9649-171b-443f-b230-cf638b6e3d4c'
  }
  */
  /*
    const associationsMap = {
      event_id_1: [{ contact: c1.id, association_type: 'contact' }],
      event_id_2: [{ contact: c2.id, association_type: 'contact' }],
    }
  */
  const associationsMap = {}
  for (const event of confirmed.filter(event => { if (event.attendees) return true })) {
    associationsMap[event.id] = event.attendees.filter(attendee => { if (contactsMap[attendee.email]) return true }).map(attendee => {
      return {
        association_type: 'contact',
        contact: contactsMap[attendee.email]
      }
    })
  }

  return associationsMap
}


module.exports = {
  getAssociationsMap
}
