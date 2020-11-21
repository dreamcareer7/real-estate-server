const Context = require('../../Context')
const { deleteByGoogleCredential } = require('../../UsersJob/google')

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

  return
}


module.exports = {
  disconnect
}