const GoogleContact = require('../../../contact')
const GoogleCredential = {
  ...require('../../../credential/update')
}

const toSkipGroups = ['contactGroups/chatBuddies', 'contactGroups/all', 'contactGroups/myContacts']


const syncContactGroups = async (google, credential) => {
  try {
    const { contactGroups, nextSyncToken } = await google.listContactGroups(credential)

    /*
      // Handle deleted groups ??? !!!

      contactGroups [
        {
          resourceName: 'contactGroups/552bb6fc0b14a9d2',
          metadata: { updateTime: '2021-01-18T13:01:57.371Z', deleted: true },
          groupType: 'USER_CONTACT_GROUP'
        },

        {
          google_credential: '05376400-626c-4524-812f-2b8b70466220',
          resource_id: 'contactGroups/552bb6fc0b14a9d2',
          resource_name: null,
          resource: '{"resourceName":"contactGroups/552bb6fc0b14a9d2","metadata":{"updateTime":"2021-01-18T13:01:57.371Z","deleted":true},"groupType":"USER_CONTACT_GROUP"}'
        }
      ]
    */

    const deleted   = contactGroups.filter(group => (group.metadata && group.metadata.deleted))
    const confirmed = contactGroups.filter(group => !(group.metadata && group.metadata.deleted))

    if (!contactGroups.length) {
      return {
        status: true,
        syncToken: nextSyncToken
      }
    }

    const groups = contactGroups
      .filter(group => !toSkipGroups.includes(group.resourceName) && group.name)
      .map(group => {
      return {
        google_credential: credential.id,
        resource_id: group.resourceName,
        resource_name: group.name || null,
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