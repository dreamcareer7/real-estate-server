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
        resource_id: group.resourceName,
        resource_name: group.name,
        resource: group
      }
    })
  
    for (const group of groups) {
      await GoogleContact.addContactGroup(credential, group)
    }

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