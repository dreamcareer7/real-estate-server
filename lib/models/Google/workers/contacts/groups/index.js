const GoogleContact = require('../../../contact')
const GoogleCredential = {
  ...require('../../../credential/update')
}

const toSkipGroups = ['contactGroups/chatBuddies', 'contactGroups/all', 'contactGroups/myContacts']


const syncContactGroups = async (google, credential) => {
  try {
    const { contactGroups, nextSyncToken } = await google.listContactGroups(credential.cgroups_sync_token)

    if (!contactGroups.length) {
      return {
        status: true,
        syncToken: nextSyncToken
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

    if (nextSyncToken) {
      await GoogleCredential.updateContactGroupsSyncToken(credential.id, nextSyncToken)
    }

    return  {
      status: true
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