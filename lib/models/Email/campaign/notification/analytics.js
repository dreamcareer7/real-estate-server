const { email_events, blackListIPS } = require('./constants')
const { handleEvents } = require('./events')
const { handleNotifications } = require('./notifications')

const GOOGLE_BOT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246 Mozilla/5.0'


const filterOutGoogleBot = object => {
  // Filter Google Bot events (For more info: https://www.gmass.co/blog/false-opens-in-gmail/)
  let ua = null

  if ( object.origin === 'mailgun' ) {
    ua = object['client-info'] ? object['client-info']['user-agent'] : null
  }

  if ( object.origin === 'outlook' || object.origin === 'gmail' ) {
    ua = object['headers'] ? object['headers']['user-agent'] : null
  }

  if ( ua === GOOGLE_BOT_UA ) {
    return true
  }

  return false
}

const filterOutBlackListIPs = (object) => {
  // getting IP address from the request header;
  const ip  = object.headers && (object.headers['X-Forwarded-For'] || object.headers['x-forwarded-for']) || null
  
  if (!ip) {
    return
  }

  return blackListIPS.includes(ip)
}

const addEvent = async ({ object, event, created_at }) => {   
  if (filterOutGoogleBot(object) || filterOutBlackListIPs(object)) {
    return
  }
  
  await handleEvents(object, event, created_at)

  /*
    Clicked notifications will be sent real time
    Opened notifications will be throttled once they are processd in handleEvents method.
  */

  if ( event === email_events.clicked ) {
    await handleNotifications(object, event)
  }
}


module.exports = {
  addEvent
}