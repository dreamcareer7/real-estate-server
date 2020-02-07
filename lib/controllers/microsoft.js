const config  = require('../config')
const Context = require('../models/Context')
const am      = require('../utils/async_middleware.js')

const Slack                 = require('../models/Slack')
const Brand                 = require('../models/Brand')
const MicrosoftAuthLink     = require('../models/Microsoft/auth_link')
const MicrosoftCredential   = require('../models/Microsoft/credential')
const MicrosoftMessage      = require('../models/Microsoft/message')
const MicrosoftSyncHistory  = require('../models/Microsoft/sync_history')
const MicrosoftWorker       = require('../models/Microsoft/workers')
const MicrosoftCalendar     = require('../models/Microsoft/calendar')
const MicrosoftSubscription = require('../models/Microsoft/subscription')

const SUBSCRIPTION_SECRET = config.microsoft_integration.subscription_secret


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

  if (!brand || !brand.id)
    throw Error.BadRequest('Brand is not specified.')
  
  return brand.id
}

function sendSlackMessage (text, ex) {
  Context.log(ex)

  Slack.send({ channel: '7-server-errors',  text, emoji: ':skull:' })
  Slack.send({ channel: 'integration_logs', text, emoji: ':skull:' })
}

function checkCredentialUser (credential, user, brand) {
  if ( credential.user !== user )
    throw Error.Unauthorized('Invalid user credential.')

  if ( credential.brand !== brand )
    throw Error.Unauthorized('Invalid brand credential.')
}


const requestMicrosoftAccess = async function (req, res) {
  const brand    = getCurrentBrand()
  const user     = req.user.id

  const scopes   = ['Contacts.Read', 'Mail.Read', 'Mail.Send'] // 'Calendars.ReadWrite'
  const redirect = req.body.redirect || 'https://rechat.com/dashboard/contacts/'

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
  if (req.query.error)
    return res.redirect('https://rechat.com/dashboard')

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

const deleteAccount = async function (req, res) {
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

  await MicrosoftSubscription.stop(credential)
  await MicrosoftCredential.disableEnableSync(credential.id, 'disable')

  const updated_credential = await MicrosoftCredential.get(credential.id)

  return res.model(updated_credential)
}

const disableEnableSync = async function (req, res) {
  const user  = req.user.id
  const brand = getCurrentBrand()

  const credential = await MicrosoftCredential.get(req.params.id)

  checkCredentialUser(credential, user, brand)

  if (credential.revoked) {
    return res.model(credential)
  }

  if ( credential.sync_status === 'pending' ) {
    throw Error.BadRequest('Please wait until current sync job is finished.')
  }

  let action = 'enable'

  if ( req.method.toLowerCase() === 'delete' ) {
    action = 'disable'
  }

  if ( action === 'disable' ) {
    await MicrosoftSubscription.stop(credential)
  }

  await MicrosoftCredential.disableEnableSync(credential.id, action)

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

  checkCredentialUser(credential, user, brand)

  if ( credential.deleted_at )
    throw Error.BadRequest('Microsoft-Credential Is Deleted!')

  if ( credential.revoked )
    throw Error.BadRequest('Your Microsoft-Account is already revoked!')

  try {

    await MicrosoftMessage.updateReadStatus(credential, [messageId], Boolean(req.body.status))

  } catch (ex) {

    const text = `Outlook-Update-Read-Status-Failed - credential: ${credential.id} - Ex: ${ex.message}`
    const msg  = `Outlook-Update-Read-Status-Failed Ex: ${JSON.stringify(ex)}`
    sendSlackMessage(text, msg)
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

  checkCredentialUser(credential, user, brand)

  if ( credential.deleted_at )
    throw Error.BadRequest('Microsoft-Credential Is Deleted!')

  if ( credential.revoked )
    throw Error.BadRequest('Your Microsoft-Account is already revoked!')

  try {

    await MicrosoftMessage.updateReadStatus(credential, messageIds, Boolean(req.body.status))

  } catch (ex) {

    const text = `Outlook-Update-Read-Status-Failed - credential: ${credential.id} - Ex: ${ex.message}`
    const msg  = `Outlook-Update-Read-Status-Failed Ex: ${JSON.stringify(ex)}`
    sendSlackMessage(text, msg)
  }

  return res.status(202).end()
}

const getRemoteMicrosoftCalendars = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id
  const gcid  = req.params.gcid

  if(!gcid)
    throw Error.BadRequest('Microsoft-Credential-Id is not specified.')

  const credential = await MicrosoftCredential.get(gcid)

  checkCredentialUser(credential, user, brand)

  const response = await MicrosoftCalendar.getRemoteMicrosoftCalendars(credential)

  return res.model(response)
}

const configureCaledars = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id
  const gcid  = req.params.gcid

  if(!gcid)
    throw Error.BadRequest('Microsoft-Credential-Id is not specified.')

  const credential = await MicrosoftCredential.get(gcid)

  checkCredentialUser(credential, user, brand)

  const temp       = req.body.toSync || []
  const toStopSync = req.body.toStopSync || []

  const toSync = temp.filter(c => { if (!toStopSync.includes(c)) return true })

  const length = toSync.length + toStopSync.length

  if ( length === 0 )
    return res.status(204).end()

  await MicrosoftCalendar.configureCalendars(credential, { toSync, toStopSync })

  return res.status(204).end()
}

const webhookValidation = async function (req, res, next) {
  if (req.query && req.query.validationToken) {
    return res.status(200).send(req.query.validationToken)
  }

  let clientState = true

  for (let i = 0; i < req.body.value.length; i++) {
    if ( req.body.value[i].clientState !== SUBSCRIPTION_SECRET ) {
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
  for (let i = 0; i < req.body.value.length; i++) {
    const event = req.body.value[i]

    MicrosoftWorker.pushEvent(event)
  }

  return res.status(202).end()  
}


const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.post('/users/self/microsoft', auth, brandAccess, am(requestMicrosoftAccess))
  app.get('/users/self/microsoft', auth, brandAccess, am(getMicrosoftProfiles))
  app.get('/users/self/microsoft/:id', auth, brandAccess, am(getMicrosoftProfile))

  app.delete('/users/self/microsoft/:id', auth, brandAccess, am(deleteAccount)) // Delete Button On Web-App

  app.delete('/users/self/microsoft/:id/sync', auth, brandAccess, am(disableEnableSync)) // Did not use by Client yet
  app.put('/users/self/microsoft/:id/sync', auth, brandAccess, am(disableEnableSync)) // Did not use by Client yet

  app.post('/users/self/microsoft/:id/sync', auth, brandAccess, am(forceSync))
  app.get('/users/self/microsoft/sync_history/:id', auth, brandAccess, am(getGCredentialLastSyncHistory))

  app.put('/emails/microsoft/:mcid/messages/:mid', auth, brandAccess, am(updateReadStatus))
  app.put('/emails/microsoft/:mcid/messages', auth, brandAccess, am(batchUpdateReadStatus))

  app.get('/users/microsoft/:gcid/calendars', auth, brandAccess, am(getRemoteMicrosoftCalendars))
  app.post('/users/microsoft/:gcid/conf', auth, brandAccess, am(configureCaledars))

  app.get('/webhook/microsoft/grant', am(grantAccess))
  app.all('/webhook/microsoft/outlook', am(webhookValidation), am(webhook))
}

module.exports = router
