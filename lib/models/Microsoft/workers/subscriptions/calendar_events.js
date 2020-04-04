const MicrosoftCalendarEvent = require('../../calendar_events')
const getClient = require('../../client')


const test = async (credential, resourceId) => {
  const microsoft = await getClient(credential, 'calendar')

}


module.exports = {
  test
}