const Context = require('../../../../Context')
const GoogleContact = require('../../../contact')
const GoogleCredential = {
  ...require('../../../credential/update')
}

const toSkipGroups = ['contactGroups/chatBuddies', 'contactGroups/all', 'contactGroups/myContacts']


const syncContactGroups = async (google, credential) => {
  Context.log('syncGoogleContacts', 'in syncContactGroups method')
  try {
    const { contactGroups, nextSyncToken } = await google.listContactGroups(credential.cgroups_sync_token)
    Context.log('syncGoogleContacts', 'listContactGroups', JSON.stringify({ contactGroups, nextSyncToken }))
    if (!contactGroups.length) {
      return {
        status: true,
        syncToken: nextSyncToken
      }
    }

    const deleted   = contactGroups.filter(group => (group.metadata && group.metadata.deleted))
    const confirmed = contactGroups.filter(group => !(group.metadata && group.metadata.deleted))
    Context.log('syncGoogleContacts', 'after filter', JSON.stringify({ confirmed, deleted }))
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
    Context.log('syncGoogleContacts', 'confirmedGroups', JSON.stringify({ confirmedGroups }))
    const deletedGroups = deleted
      .map(group => {
        return {
          google_credential: credential.id,
          resource_id: group.resourceName
        }
      })
    Context.log('syncGoogleContacts', 'deletedGroups', JSON.stringify({ deletedGroups }))
    await GoogleContact.addContactGroups(confirmedGroups)
    await GoogleContact.deleteManyCGroups(deletedGroups)

    if (nextSyncToken) {
      Context.log('syncGoogleContacts', 'nextSyncToken', JSON.stringify({ nextSyncToken }))
      await GoogleCredential.updateContactGroupsSyncToken(credential.id, nextSyncToken)
    }

    return  {
      status: true
    }

  } catch (ex) {
    Context.log('syncGoogleContacts', 'in catch syncContactGroups', JSON.stringify({ ex }))
    return  {
      status: false,
      ex
    }
  }
}

module.exports = {
  syncContactGroups
}