const am = require('../utils/async_middleware.js')
const Context = require('../models/Context')

const Slack                = require('../models/Slack')
const Brand                = require('../models/Brand')
const MicrosoftAuthLink    = require('../models/Microsoft/auth_link')
const MicrosoftCredential  = require('../models/Microsoft/credential')
const MicrosoftMessage     = require('../models/Microsoft/message')
const MicrosoftSyncHistory = require('../models/Microsoft/sync_history')



function brandAccess(req, res, next) {
  const brand = getCurrentBrand()
  const user = req.user.id

  return Brand.limitAccess({ user, brand }).nodeify(err => {
    if (err) {
      return res.error(err)
    }

    next()
  })
}

function getCurrentBrand() {
  const brand = Brand.getCurrent()

  if (!brand || !brand.id)
    throw Error.BadRequest('Brand is not specified.')
  
  return brand.id
}

function sendSlackMessage(text, ex) {
  Context.log(ex)

  Slack.send({ channel: '7-server-errors',  text, emoji: ':skull:' })
  Slack.send({ channel: 'integration_logs', text, emoji: ':skull:' })
}

function checkCredentialUser(credential, user, brand) {
  if ( credential.user !== user )
    throw Error.Unauthorized('Invalid user credential.')

  if ( credential.brand !== brand )
    throw Error.Unauthorized('Invalid brand credential.')
}


const requestMicrosoftAccess = async function (req, res) {
  const brand    = getCurrentBrand()
  const user     = req.user.id

  if (req.body.scopes) {
    if ( !Array.isArray(req.body.scopes) )
      throw Error.BadRequest('Scopes should be an array.')
  }

  const scopes   = req.body.scopes || ['Contacts.Read', 'Mail.Read', 'Mail.Send'] // 'Mail.ReadWrite' is included into 'Mail.Send'
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

  if (credential.revoked)
    return res.model(credential)

  if ( credential.sync_status === 'pending' )
    throw Error.BadRequest('Please wait until current sync job finished.')

  await MicrosoftCredential.disableEnableSync(credential.id, 'disable')

  const updated_credential = await MicrosoftCredential.get(credential.id)

  return res.model(updated_credential)
}

const disableEnableSync = async function (req, res) {
  const user  = req.user.id
  const brand = getCurrentBrand()

  const credential = await MicrosoftCredential.get(req.params.id)

  checkCredentialUser(credential, user, brand)

  if (credential.revoked)
    return res.model(credential)

  if ( credential.sync_status === 'pending' )
    throw Error.BadRequest('Please wait until current sync job finished.')

  let action = 'enable'

  if ( req.method.toLowerCase() === 'delete' )
    action = 'disable'

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

    await MicrosoftMessage.updateReadStatus(credential, messageId, Boolean(req.body.status))

  } catch (ex) {

    const text = `Outlook-Update-Read-Status-Failed - credential: ${credential.id} - Ex: ${ex.message}`
    const msg  = `Outlook-Update-Read-Status-Failed Ex: ${JSON.stringify(ex)}`
    sendSlackMessage(text, msg)
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

  app.get('/webhook/microsoft/grant', am(grantAccess))
}

module.exports = router
