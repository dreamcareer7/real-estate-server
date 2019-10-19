const GoogleCalendar = require('../../calendar')

const { getToSyncCalendars } = require('./common')


const syncCalendars = async (google, data) => {
  try {

    const toSync = await getToSyncCalendars(data.googleCredential.id)

    await GoogleCalendar.persistRemoteCalendars(data.googleCredential.id, toSync)

    return  {
      status: true,
      ex: null
    }

  } catch (ex) {

    return  {
      status: false,
      ex: ex
    }
  }
}


module.exports = {
  syncCalendars
}