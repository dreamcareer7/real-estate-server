const am     = require('../utils/async_middleware.js')
const config = require('../config')
const Url    = require('../models/Url')
const Brand  = require('../models/Brand')


const UsersJob          = require('../models/UsersJob')
const MicrosoftAuthLink = require('../models/Microsoft/auth_link')
const MicrosoftMessage  = require('../models/Microsoft/message')
const MicrosoftWorker   = require('../models/Microsoft/workers')

const { getRemoteMicrosoftCalendars, configureCalendars } = require('../models/Microsoft/calendar/upsert')
const { get, getByUser } = require('../models/Microsoft/credential/get')
const { disconnect: disconnectCredential } = require('../models/Microsoft/credential/update')

const debouncer = require('../models/Microsoft/debouncer')

const SUBSCRIPTION_SECRET_MAILBOX  = config.microsoft_integration.subscription_secret
const SUBSCRIPTION_SECRET_CALENDAR = config.microsoft_integration.subscription_secret_calendar
const SUBSCRIPTION_SECRET_CONTACTS = config.microsoft_integration.subscription_secret_contacts
const SUBSCRIPTION_SECRETS         = [SUBSCRIPTION_SECRET_MAILBOX, SUBSCRIPTION_SECRET_CALENDAR, SUBSCRIPTION_SECRET_CONTACTS]

const { sendSlackMessage, checkCredentialUser, checkModifyAccess } = require('../models/Microsoft/common')



function brandAccess (req, res, next) {
  const brand = getCurrentBrand()
  const user  = req.user.id

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
  const redirect = req.body.redirect || Url.web({ uri: '/dashboard/contacts' })
  const type     = 'microsoft_auth_link'

  const scopes = ['Contacts', 'Mail.Read', 'Mail.Send', 'Calendars.ReadWrite']
  const url    = await MicrosoftAuthLink.requestMicrosoftAccess(user, brand, scopes, redirect)

  return res.json({
    code: 'OK',
    data: {
      url,
      redirect,
      type
    }
  })
}

const grantAccess = async function (req, res) {
  if (req.query.error === 'access_denied') {
    const url = Url.web({ uri: '/dashboard' })
    return res.redirect(url)
  }

  if (!req.query.code) {
    throw Error.BadRequest('Code is not specified.')
  }

  if (!req.query.state) {
    throw Error.BadRequest('State is not specified.')
  }

  const { redirect } = await MicrosoftAuthLink.grantAccess(req.query)

  res.writeHead(302, { 'Location': redirect })
  res.end()
}

const getMicrosoftProfiles = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id

  const credentials = await getByUser(user, brand)

  return res.collection(credentials)
}

const getMicrosoftProfile = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id

  const credential = await get(req.params.id)

  checkCredentialUser(credential, user, brand)

  return res.model(credential)
}

const disconnect = async function (req, res) {
  const user  = req.user.id
  const brand = getCurrentBrand()

  const credential = await get(req.params.id)
  checkCredentialUser(credential, user, brand)

  if ( credential.deleted_at || credential.revoked ) {
    return res.model(credential)
  }

  await disconnectCredential(credential.id)
  MicrosoftWorker.Disconnect.credential({ id: credential.id })

  const updated_credential = await get(credential.id)
  return res.model(updated_credential)
}

const forceSync = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id

  const credential = await get(req.params.id)

  checkCredentialUser(credential, user, brand)

  await UsersJob.forceSyncByMicrosoftCredential(credential.id, 'outlook')
  await UsersJob.forceSyncByMicrosoftCredential(credential.id, 'contacts')
  await UsersJob.forceSyncByMicrosoftCredential(credential.id, 'calendar')

  const updated_credential = await get(credential.id)

  return res.model(updated_credential)
}

/**
 * @param {import('../../types/monkey/controller').IAuthenticatedRequest<{ mcid: UUID; mid: UUID; }, {}, { status: boolean }>} req 
 * @param {import('../../types/monkey/controller').IResponse} res 
 */
const updateReadStatus = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id

  const messageId  = req.params.mid
  const credential = await get(req.params.mcid)

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
  const credential = await get(req.params.mcid)

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
  const credential = await get(req.params.mcid)

  checkModifyAccess(credential, user, brand)

  try {
    await MicrosoftMessage.batchTrash(credential, messageIds)
  } catch (ex) {
    const text = `Outlook-Trash-Failed - credential: ${credential.id} - Ex: ${ex.message}`
    sendSlackMessage(text, ex)
  }

  return res.status(202).end()
}

const batchArchive = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id

  const messageIds = req.body.messageIds
  const credential = await get(req.params.mcid)

  checkModifyAccess(credential, user, brand)

  try {
    await MicrosoftMessage.batchArchive(credential, messageIds)
  } catch (ex) {
    const text = `Outlook-Archive-Failed - credential: ${credential.id} - Ex: ${ex.message}`
    sendSlackMessage(text, ex)
  }

  return res.status(202).end()
}

const getRemoteCalendars = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id
  const mcid  = req.params.mcid

  const credential = await get(mcid)

  checkCredentialUser(credential, user, brand)

  const response = await getRemoteMicrosoftCalendars(credential)

  return res.model(response)
}

const configureMCalendars = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id
  const mcid  = req.params.mcid

  const credential = await get(mcid)

  checkCredentialUser(credential, user, brand)

  const temp       = req.body.toSync || []
  const toStopSync = req.body.toStopSync || []

  const toSync = temp.filter(c => { if (!toStopSync.includes(c)) return true })
  const length = toSync.length + toStopSync.length

  if ( length === 0 ) {
    return res.status(204).end()
  }

  await configureCalendars(credential, { toSync, toStopSync })

  return res.status(204).end()
}

const webhookValidation = async function (req, res, next) {
  if (req.query && req.query.validationToken) {
    return res.status(202).send(req.query.validationToken)
  }

  let clientState = true

  for (let i = 0; i < req.body.value.length; i++) {
    if (!SUBSCRIPTION_SECRETS.includes(req.body.value[i].clientState)) {
      clientState = false
      break
    }
  }

  if (!clientState) {
    return res.status(202).end()
  }

  next()
}

const webhook = async function (req, res) {
  for (let i = 0; i < req.body.value.length; i++) {
    const event = req.body.value[i]

    if ( event.clientState === SUBSCRIPTION_SECRET_MAILBOX ) {
      if ( event.lifecycleEvent === 'subscriptionRemoved' || event.lifecycleEvent === 'missed' ) {
        MicrosoftWorker.Outlook.pushEvent({ payload: event })

      } else {

        const keyObj = {
          sId: event.subscriptionId,
          cType: event.changeType,
          rId: event.resourceData.id,
        }

        debouncer.outlook(JSON.stringify(keyObj))
      }
    }

    if ( event.clientState === SUBSCRIPTION_SECRET_CALENDAR ) {
      MicrosoftWorker.Calendar.pushEvent({ payload: event })
    }

    if ( event.clientState === SUBSCRIPTION_SECRET_CONTACTS ) {
      MicrosoftWorker.Contacts.pushEvent({ payload: event })
    }
  }

  return res.status(202).end()  
}


const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.post('/users/self/microsoft', auth, brandAccess, am(requestMicrosoftAccess))
  app.get('/users/self/microsoft', auth, brandAccess, am(getMicrosoftProfiles))
  app.get('/users/self/microsoft/:id', auth, brandAccess, am(getMicrosoftProfile))

  app.delete('/users/self/microsoft/:id', auth, brandAccess, am(disconnect)) // Disconnect Button On Web-App
  app.post('/users/self/microsoft/:id/sync', auth, brandAccess, am(forceSync)) // Sync now Button On Web-App

  app.put('/emails/microsoft/:mcid/messages/:mid', auth, brandAccess, am(updateReadStatus))
  app.put('/emails/microsoft/:mcid/messages', auth, brandAccess, am(batchUpdateReadStatus))
  app.post('/emails/microsoft/:mcid/trash', auth, brandAccess, am(batchTrash))
  app.post('/emails/microsoft/:mcid/archive', auth, brandAccess, am(batchArchive))

  app.get('/users/microsoft/:mcid/calendars', auth, brandAccess, am(getRemoteCalendars))
  app.post('/users/microsoft/:mcid/conf', auth, brandAccess, am(configureMCalendars))

  app.get('/webhook/microsoft/grant', am(grantAccess))
  app.all('/webhook/microsoft/outlook', am(webhookValidation), am(webhook))
}

module.exports = router