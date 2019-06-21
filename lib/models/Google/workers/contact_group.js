const db = require('../../../utils/db.js')

const GoogleCredential = require('../credential')



const addContactGroup = async (credential, contactGroup) => {
  return db.insert('google/contact_group/insert', [credential.id, contactGroup.resourceName, contactGroup])
}

const syncContactGroups = async (google, data) => {
  try {
    const { contactGroups, syncToken } = await google.listContactGroups(data.googleCredential.contact_groups_sync_token)

    for (const contactGroup of contactGroups) {
      if (contactGroup.metadata) {
        if (contactGroup.metadata.deleted)
          continue
      }

      await addContactGroup(data.googleCredential, contactGroup)
    }

    await GoogleCredential.updateContactGroupsSyncToken(data.googleCredential.id, syncToken)

    return  {
      syncToken: syncToken,
      status: true
    }

  } catch (ex) {

    return  {
      syncToken: null,
      status: false,
      ex: ex
    }
  }
}

module.exports = {
  syncContactGroups
}