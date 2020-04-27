const am     = require('../utils/async_middleware.js')
const config = require('../config')
const Url    = require('../models/Url')
const Brand  = require('../models/Brand')

const MicrosoftAuthLink     = require('../models/Microsoft/auth_link')
const MicrosoftCredential   = require('../models/Microsoft/credential')
const MicrosoftMessage      = require('../models/Microsoft/message')
const MicrosoftSyncHistory  = require('../models/Microsoft/sync_history')
const MicrosoftCalendar     = require('../models/Microsoft/calendar')
const MicrosoftSubscription = require('../models/Microsoft/subscription')
const MicrosoftWorker       = require('../models/Microsoft/workers')

const SUBSCRIPTION_SECRET     = config.microsoft_integration.subscription_secret
const SUBSCRIPTION_SECRET_CAL = config.microsoft_integration.subscription_secret_calendar

const { sendSlackMessage, checkCredentialUser, checkModifyAccess } = require('../models/Microsoft/common')



function brandAccess (req, res, next) {
  const brand = getCurrentBrand()
  const user = req.user.id

  return Brand.limitAccess({ user, brand }).nodeify(err => {
    if (err) {
      return res.error(err)
    }

    next()
  })
}

function getCurrentBrand () {
  const brand = Brand.getCurrent()

  if (!brand || !brand.id) {
    throw Error.BadRequest('Brand is not specified.')
  }
  
  return brand.id
}


const requestMicrosoftAccess = async function (req, res) {
  const brand    = getCurrentBrand()
  const user     = req.user.id

  const scopes   = ['Contacts.Read', 'Mail.Read', 'Mail.Send']
  const redirect = req.body.redirect || Url.web({ uri: '/dashboard/contacts' })

  if ( process.env.API_HOSTNAME === 'alpine.api.rechat.com' || process.env.API_HOSTNAME === 'boer.api.rechat.com' ) {
    scopes.push('Calendars.ReadWrite')
  }

  const url = await MicrosoftAuthLink.requestMicrosoftAccess(user, brand, scopes, redirect)

  return res.json({
    'code': 'OK',
    'data': {
      'url': url,
      'redirect': redirect,
      'type': 'microsoft_auth_link'
    }
  })
}

const grantAccess = async function (req, res) {
  if(req.query.error === 'access_denied') {
    const url = Url.web({ uri: '/dashboard' })
    return res.redirect(url)
  }

  if (!req.query.code)
    throw Error.BadRequest('Code is not specified.')

  if (!req.query.state)
    throw Error.BadRequest('State is not specified.')

  const { redirect } = await MicrosoftAuthLink.grantAccess(req.query)

  res.writeHead(302, { 'Location': redirect })
  res.end()
}

const getMicrosoftProfiles = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id

  const credentials = await MicrosoftCredential.getByUser(user, brand)

  return res.collection(credentials)
}

const getMicrosoftProfile = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id

  if (!req.params.id)
    throw Error.BadRequest('Id is not specified.')

  const credential = await MicrosoftCredential.get(req.params.id)

  checkCredentialUser(credential, user, brand)

  return res.model(credential)
}

const disconnect = async function (req, res) {
  const user  = req.user.id
  const brand = getCurrentBrand()

  const credential = await MicrosoftCredential.get(req.params.id)

  checkCredentialUser(credential, user, brand)

  if (credential.revoked || credential.deleted_at) {
    return res.model(credential)
  }

  if ( credential.sync_status === 'pending' ) {
    throw Error.BadRequest('Please wait until current sync job is finished.')
  }

  // if (credential.scope_summary && credential.scope_summary.includes('calendar')) {
  //   const calendars = await MicrosoftCalendar.getAllByGoogleCredential(credential.id)
  //   const toStop    = calendars.filter(cal => cal.watcher_status !== 'stopped')

  //   const promises = toStop.map(cal => MicrosoftCalendar.stopWatchCalendar(cal))
  //   await Promise.all(promises)
  // }

  await MicrosoftSubscription.stop(credential.id)
  await MicrosoftCredential.disableSync(credential.id)
  await MicrosoftMessage.deleteByCredential(credential.id)

  const updated_credential = await MicrosoftCredential.get(credential.id)

  return res.model(updated_credential)
}

const forceSync = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id

  const credential = await MicrosoftCredential.get(req.params.id)

  checkCredentialUser(credential, user, brand)

  await MicrosoftCredential.forceSync(credential.id)

  const updated_credential = await MicrosoftCredential.get(credential.id)

  return res.model(updated_credential)
}

const getGCredentialLastSyncHistory = async function (req, res) {
  const user = req.user.id
  const brand = getCurrentBrand()

  const microsoft_credential_id = req.params.id

  const history = await MicrosoftSyncHistory.getMCredentialLastSyncHistory(user, brand, microsoft_credential_id)

  checkCredentialUser(history, user, brand)

  return res.model(history)
}

/**
 * @param {import('../../types/monkey/controller').IAuthenticatedRequest<{ mcid: UUID; mid: UUID; }, {}, { status: boolean }>} req 
 * @param {import('../../types/monkey/controller').IResponse} res 
 */
const updateReadStatus = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id

  const messageId  = req.params.mid
  const credential = await MicrosoftCredential.get(req.params.mcid)

  checkModifyAccess(credential, user, brand)

  try {

    await MicrosoftMessage.updateReadStatus(credential, [messageId], Boolean(req.body.status))

  } catch (ex) {

    const text = `Outlook-Update-Read-Status-Failed - credential: ${credential.id} - Ex: ${ex.message}`
    sendSlackMessage(text, ex)
  }

  return res.status(202).end()
}

/**
 * @param {import('../../types/monkey/controller').IAuthenticatedRequest<{ mcid: UUID; }, {}, { status: boolean, messageIds: Array }>} req 
 * @param {import('../../types/monkey/controller').IResponse} res 
 */
const batchUpdateReadStatus = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id

  const messageIds = req.body.messageIds
  const credential = await MicrosoftCredential.get(req.params.mcid)

  checkModifyAccess(credential, user, brand)

  try {

    await MicrosoftMessage.updateReadStatus(credential, messageIds, Boolean(req.body.status))

  } catch (ex) {

    const text = `Outlook-Update-Read-Status-Failed - credential: ${credential.id} - Ex: ${ex.message}`
    sendSlackMessage(text, ex)
  }

  return res.status(202).end()
}

const batchTrash = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id

  const messageIds = req.body.messageIds
  const credential = await MicrosoftCredential.get(req.params.mcid)

  checkModifyAccess(credential, user, brand)

  try {

    await MicrosoftMessage.batchTrash(credential, messageIds)

  } catch (ex) {

    const text = `Outlook-Trash-Failed - credential: ${credential.id} - Ex: ${ex.message}`
    sendSlackMessage(text, ex)
  }

  return res.status(202).end()
}

const getRemoteMicrosoftCalendars = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id
  const mcid  = req.params.mcid

  if(!mcid) {
    throw Error.BadRequest('Microsoft-Credential-Id is not specified.')
  }

  const credential = await MicrosoftCredential.get(mcid)

  checkCredentialUser(credential, user, brand)

  const response = await MicrosoftCalendar.getRemoteMicrosoftCalendars(credential)

  return res.model(response)
}

const configureCaledars = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id
  const mcid  = req.params.mcid

  if(!mcid) {
    throw Error.BadRequest('Microsoft-Credential-Id is not specified.')
  }

  const credential = await MicrosoftCredential.get(mcid)

  checkCredentialUser(credential, user, brand)

  const temp       = req.body.toSync || []
  const toStopSync = req.body.toStopSync || []

  const toSync = temp.filter(c => { if (!toStopSync.includes(c)) return true })

  const length = toSync.length + toStopSync.length

  if ( length === 0 ) {
    return res.status(204).end()
  }

  await MicrosoftCalendar.configureCalendars(credential, { toSync, toStopSync })

  return res.status(204).end()
}

const webhookValidation = async function (req, res, next) {
  if (req.query && req.query.validationToken) {
    return res.status(200).send(req.query.validationToken)
  }

  let clientState = true

  for (let i = 0; i < req.body.value.length; i++) {
    if ( req.body.value[i].clientState !== SUBSCRIPTION_SECRET && req.body.value[i].clientState !== SUBSCRIPTION_SECRET_CAL ) {
      clientState = false
      break
    }
  }

  if (!clientState) {
    return res.status(200).end()
  }

  next()
}

const webhook = async function (req, res) {
  // debounce key => data.subscriptionId (include missed and exclude subscriptionRemoved notifications)
  // Push subscriptionRemoved directly to the Q

  for (let i = 0; i < req.body.value.length; i++) {
    const event = req.body.value[i]

    if ( event.clientState === SUBSCRIPTION_SECRET ) {
      MicrosoftWorker.Outlook.pushEvent(event)
    }

    if ( event.clientState === SUBSCRIPTION_SECRET_CAL ) {
      MicrosoftWorker.Calendar.pushEvent(event)
    }
  }

  return res.status(202).end()  
}


const Test = require('../models/Microsoft/test')


const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.post('/users/self/microsoft', auth, brandAccess, am(requestMicrosoftAccess))
  app.get('/users/self/microsoft', auth, brandAccess, am(getMicrosoftProfiles))
  app.get('/users/self/microsoft/:id', auth, brandAccess, am(getMicrosoftProfile))

  app.delete('/users/self/microsoft/:id', auth, brandAccess, am(disconnect)) // Disconnect Button On Web-App

  app.post('/users/self/microsoft/:id/sync', auth, brandAccess, am(forceSync)) // Sync now Button On Web-App
  app.get('/users/self/microsoft/sync_history/:id', auth, brandAccess, am(getGCredentialLastSyncHistory))

  app.put('/emails/microsoft/:mcid/messages/:mid', auth, brandAccess, am(updateReadStatus))
  app.put('/emails/microsoft/:mcid/messages', auth, brandAccess, am(batchUpdateReadStatus))
  app.post('/emails/microsoft/:mcid/trash', auth, brandAccess, am(batchTrash))

  app.get('/users/microsoft/:mcid/calendars', auth, brandAccess, am(getRemoteMicrosoftCalendars))
  app.post('/users/microsoft/:mcid/conf', auth, brandAccess, am(configureCaledars))

  app.get('/webhook/microsoft/grant', am(grantAccess))
  app.all('/webhook/microsoft/outlook', am(webhookValidation), am(webhook))


  app.get('/microsoft/test', am(Test.test))
}

module.exports = router