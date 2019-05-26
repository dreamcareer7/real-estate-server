const GoogleCredential = require('../credential')
const GoogleContactGroup    = require('../contact_group')
const GooglePlugin     = require('../plugin')


let google

const setupClient = async function(credential) {
  if(google)
    return google

  google = await GooglePlugin.setupClient(credential)

  // @ts-ignore
  google.oAuth2Client.on('tokens', async (tokens) => {
    if (tokens.refresh_token) {
      await GoogleCredential.updateRefreshToken(credential.id, tokens.refresh_token)
      await google.setCredentials({ refresh_token: tokens.refresh_token })
    }

    await google.setCredentials({ access_token: tokens.access_token })
  })

  return google
}

const addContactGroup = async (credential, contactGroup) => {
  const id = await GoogleContactGroup.create(credential.id, contactGroup)
  // const createdOrUpdated = await GoogleContactGroup.getByResourceName(contactGroup.resourceName)

  return id
}

const removeContactGroup = async (credential, contactGroup) => {
  const oldRecord = await GoogleContactGroup.getByResourceName(contactGroup.resourceName)

  if(oldRecord) {
    await GoogleContactGroup.softDelete(contactGroup.resourceName)

  } else {

    await addContactGroup(credential, contactGroup)
    await GoogleContactGroup.softDelete(contactGroup.resourceName)
  }

  return true
}

const syncContactGroups = async (data) => {
  // data: {
  //   meta: {
  //     partialSync: Boolean,
  //     action: 'sync_contact_groups'
  //   },
  //   googleCredential: googleCredential
  // }

  const google = await setupClient(data.googleCredential)

  const { contactGroups, syncToken } = await google.listContactGroups(data.googleCredential.contact_groups_sync_token)

  const createdContactGroupIds = []

  console.log('*** contactGroups', contactGroups)

  for(const contactGroup of contactGroups) {
    if(contactGroup.metadata) {

      if( contactGroup.metadata.deleted )
        await removeContactGroup(data.googleCredential, contactGroup)

    } else {

      const id = await addContactGroup(data.googleCredential, contactGroup)
      createdContactGroupIds.push(id)
    }
  }

  await GoogleCredential.updateContactGroupsSyncToken(data.googleCredential.id, syncToken)
  await GoogleCredential.updateLastContactGroupsSyncTime(data.googleCredential.id)

  return syncToken
}


module.exports = {
  syncContactGroups
}