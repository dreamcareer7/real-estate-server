const GoogleContact = require('../../contact')



const syncContactGroups = async (google, data) => {
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
      await GoogleContact.addContactGroup(data.googleCredential, contactGroup)
    }

    return  {
      status: true
    }

  } catch (ex) {

    let err = { code: ex.statusCode || null, message: ex }

    if ( ex.statusCode === 401 )
      err = { code: ex.statusCode, message: 'invalid_grant' }

    return  {
      status: false,
      ex: err
    }
  }
}

module.exports = {
  syncContactGroups
}