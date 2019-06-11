const db = require('../../../utils/db.js')

const GoogleCredential = require('../credential')
const GooglePlugin     = require('../plugin/googleapis.js')


let google

const setupClient = async function(credential) {
  if (google) return google

  google = await GooglePlugin.setupClient(credential)

  // @ts-ignore
  google.oAuth2Client.on('tokens', async tokens => {
    if (tokens.refresh_token) {
      await GoogleCredential.updateRefreshToken(credential.id, tokens.refresh_token)
      await google.setCredentials({ refresh_token: tokens.refresh_token })
    }

    await GoogleCredential.updateAccesshToken(credential.id, tokens.access_token)
    await google.setCredentials({ access_token: tokens.access_token })
  })

  return google
}

const addContactGroup = async (credential, contactGroup) => {
  return db.insert('google/contact_group/insert', [contactGroup.resourceName, credential.id, contactGroup])
}

const removeContactGroup = async (credential, contactGroup) => {
  const ids = await db.selectIds('google/contact_group/get', [contactGroup.resourceName])

  if (ids.length === 1)
    db.update('google/contact_group/delete', [contactGroup.resourceName, credential.id, new Date()])

  return true
}

const syncContactGroups = async data => {
  try {
    const google = await setupClient(data.googleCredential)
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