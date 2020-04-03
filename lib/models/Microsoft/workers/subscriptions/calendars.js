const Context = require('../../../Context')

const MicrosoftSubscription = require('../../subscription')
const MicrosoftCalendar     = require('../../calendar')

const { createNewSubscriptions, updateSubscriptions } = require('./common')


const getToSyncCalendars = async function (gcid) {
  const calendars = await MicrosoftCalendar.getAllByMicrosoftCredential(gcid)

  const toSync = calendars.filter(cal => cal.to_sync)

  return toSync
}

const handleSubscriptions = async (microsoft, data) => {
  const resource     = '/me/events'
  const credentialId = data.microsoftCredential.id

  try {

    // const list = await microsoft.listSubscriptions()
    // Context.log('list', list)

    // for (const rec of list.value) {
    //   await microsoft.deleteSubscription(rec.id)
    // }

    const subscription = await MicrosoftSubscription.getByResource(credentialId, '/me/events')
    Context.log('***** CalendarSub handleSubscriptions subscription', subscription)

    if (!subscription) {
      Context.log('***** CalendarSub handleSubscriptions, fresh sub')
      return await createNewSubscriptions(microsoft, credentialId, resource)
    }


    // If subscription exists
    const liveSubscription = await microsoft.getSubscription(subscription.subscription_id)

    if (!liveSubscription) {
      Context.log('***** CalendarSub handleSubscriptions, going to delete offlince record and create a new sub')
      await MicrosoftSubscription.delete(subscription.id)
      return await createNewSubscriptions(microsoft, credentialId, resource)
    }

    if ( subscription.subscription_id !== liveSubscription.id ) {
      Context.log('***** CalendarSub handleSubscriptions, going to delete offlince/remote records and create a new sub')
      await MicrosoftSubscription.delete(subscription.id)
      await microsoft.deleteSubscription(liveSubscription.id)
      return await createNewSubscriptions(microsoft, credentialId, resource)
    }

    const now = new Date().getTime()
    const exp = new Date(liveSubscription.expiration_date_time).getTime()
    const gap = 60 * 60 * 1000

    if ( (exp - now) / gap < 24 ) {
      Context.log('***** CalendarSub handleSubscriptions, going to update sub')
      return await updateSubscriptions(microsoft, subscription)
    }


    Context.log('***** CalendarSub handleSubscriptions, nothing to do')

    return {
      status: true,
      ex: null
    }

  } catch(ex) {

    Context.log(`SyncMicrosoft - handleSubscriptions - catch ex => Email: ${data.microsoftCredential.email}, Code: ${ex.statusCode}, Message: ${ex.message}`)

    if ( ex.statusCode === 504 || ex.statusCode === 503 || ex.statusCode === 501 || ex.message === 'Error: read ECONNRESET' ) {
      return  {
        status: false,
        skip: true,
        ex
      }
    }
      
    return  {
      status: false,
      skip: false,
      ex
    }
  }
}


module.exports = {
  handleSubscriptions
}