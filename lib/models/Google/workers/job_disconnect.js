const Context = require('../../Context')
const { deleteByGoogleCredential } = require('../../UsersJob/google')

const { get } = require('../../Brand/role/get')
const { getUserBrands } = require('../../Brand')
const { findByUserBrand } = require('../credential')

const GoogleCalendar = {
  ...require('../calendar/get'),
  ...require('../calendar/upsert')
}

const GoogleMessage = {
  ...require('../message/delete'),
  ...require('../message/watch')
}

const GoogleCredential = {
  ...require('../credential/get'),
  ...require('../credential/update')
}



const disconnect = async (data) => {
  const credential = await GoogleCredential.get(data.id)

  if (credential.revoked) {
    return
  }

  Context.log('DisconnectGoogle - Job Started', credential.id, credential.email)

  await deleteByGoogleCredential(credential.id)

  if (credential.scope_summary && credential.scope_summary.includes('mail.read')) {
    await GoogleMessage.stopWatchMailBox(credential.id)
  }

  if (credential.scope_summary && credential.scope_summary.includes('calendar')) {
    const calendars = await GoogleCalendar.getAllByGoogleCredential(credential.id)
    const toStop    = calendars.filter(cal => cal.watcher_status !== 'stopped')

    const promises = toStop.map(cal => GoogleCalendar.stopWatchCalendar(cal))
    await Promise.all(promises)
  }

  await GoogleMessage.deleteByCredential(credential.id)
  await GoogleCredential.revoke(credential.id)

  Context.log('DisconnectGoogle - Job Finished')
}


async function disconnectAllForUser(user, role) {
  const { brand } = await get(role)
  const userBrands = await getUserBrands(user)
  // To make sure if the user completely leaves the brand. 
  // Here we have a role leave event which may have another role and still remains in the brand.
  if (userBrands.indexOf(brand) === -1) {
    const credentialIds = await findByUserBrand(user, brand)
    for(const credentialId of credentialIds) {
      await disconnect({id: credentialId})
    }
  }
}

module.exports = {
  disconnect,
  disconnectAllForUser
}