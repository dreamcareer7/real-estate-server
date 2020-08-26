const Context = require('../../Context')

const GoogleCalendar   = require('../calendar')
const GoogleMessage    = require('../message')
const GoogleCredential = require('../credential')
const UsersJob         = require('../../UsersJob')


const disconnect = async (data) => {
  const credential = await GoogleCredential.get(data.cid)

  if (credential.revoked) {
    return
  }

  Context.log('DisconnectGoogle - Job Started', credential.id, credential.email)


  await UsersJob.deleteByGoogleCredential(credential.id)

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