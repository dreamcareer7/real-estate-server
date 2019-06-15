const db = require('../../../utils/db.js')

const GoogleCredential = require('../credential')



const addContactGroup = async (credential, contactGroup) => {
  return db.insert('google/contact_group/insert', [contactGroup.resourceName, credential.id, contactGroup])
}

const removeContactGroup = async (credential, contactGroup) => {
  const ids = await db.selectIds('google/contact_group/get', [contactGroup.resourceName, credential.id])

  if (ids.length === 1)
    db.update('google/contact_group/delete', [contactGroup.resourceName, credential.id, new Date()])

  return true
}

const syncContactGroups = async (google, data) => {
  try {
    const { contactGroups, syncToken } = await google.listContactGroups(data.googleCredential.contact_groups_sync_token)

    for (const contactGroup of contactGroups) {
      if (contactGroup.metadata) {
        if (contactGroup.metadata.deleted)
          await removeContactGroup(data.googleCredential, contactGroup)

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