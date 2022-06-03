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

    const deleted   = contactGroups.filter(group => (group.metadata && group.metadata.deleted))
    const confirmed = contactGroups.filter(group => !(group.metadata && group.metadata.deleted))

    const confirmedGroups = confirmed
      .filter(group => !toSkipGroups.includes(group.resourceName))
      .map(group => {
        return {
          google_credential: credential.id,
          resource_id: group.resourceName,
          resource_name: group.name || null,
          resource: JSON.stringify(group)
        }
      })

    const deletedGroups = deleted
      .map(group => {
        return {
          google_credential: credential.id,
          resource_id: group.resourceName
        }
      })

    await GoogleContact.addContactGroups(confirmedGroups)
    await GoogleContact.deleteManyCGroups(deletedGroups)

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