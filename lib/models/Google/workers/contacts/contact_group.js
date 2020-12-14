const GoogleContact = require('../../contact')

const toSkipGroups = ['contactGroups/chatBuddies', 'contactGroups/all', 'contactGroups/myContacts']


const syncContactGroups = async (google, credential) => {
  try {
    const { contactGroups, nextSyncToken } = await google.listContactGroups(credential.cgroups_sync_token)

    if (!contactGroups.length) {
      return {
        status: true,
        nextSyncToken
      }
    }

    const groups = contactGroups.filter(group => !toSkipGroups.includes(group.resourceName)).map(group => {
      return {
        google_credential: credential.id,
        resource_id: group.resourceName,
        resource_name: group.name,
        resource: JSON.stringify(group)
      }
    })
  
    await GoogleContact.addContactGroups(groups)


    return  {
      status: true,
      nextSyncToken
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