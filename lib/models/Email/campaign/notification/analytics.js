// const { email_events } = require('./constants')
// const reactedToEvents  = [email_events.clicked, email_events.opened]

const { handleEvents } = require('./events')
// const { handleNotifications } = require('./notifications')


const addEvent = async ({ object, event, created_at }) => {
  // if ( reactedToEvents.includes(event) ) {
  //   await handleNotifications(object, event)
  // }

  await handleEvents(object, event, created_at)
}


module.exports = {
  addEvent
}