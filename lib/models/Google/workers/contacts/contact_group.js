const GoogleContact = require('../../contact')


const syncContactGroups = async (google, credential) => {
  try {
    const entries = await google.getContactGroups()

    if (!entries.length)
      return { status: true }

    const contactGroups = []

    for (const entry of entries) {
      contactGroups.push({
        entry_id: entry['id']['$t'],
        entry: entry
      })
    }
  
    for (const contactGroup of contactGroups) {
      await GoogleContact.addContactGroup(credential, contactGroup)
    }

    return  {
      status: true,
      ex: null
    }

  } catch (ex) {

    return  {
      status: false,
      ex
    }
  }
}

module.exports = {
  syncContactGroups
}