const am = require('../utils/async_middleware.js')

const Brand                = require('../models/Brand')
const MicrosoftAuthLink    = require('../models/Microsoft/auth_link')
const MicrosoftCredential  = require('../models/Microsoft/credential')
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

const requestMicrosoftAccessTest = async function (req, res) {
  const redirect = 'http://localhost:3078/dashboard/contacts?letter&s=0'
  const url      = await MicrosoftAuthLink.requestMicrosoftAccess('9fdcdf2a-8e0f-11e9-988e-0a95998482ac', '0237f9a8-8e0f-11e9-9a0e-0a95998482ac', 'https://rechat.com/dashboard')

  return res.json({
    'code': 'OK',
    'data': {
      'url': url,
      'redirect': redirect,
      'type': 'microsoft_auth_link'
    }
  })
}

const requestMicrosoftAccess = async function (req, res) {
  const brand    = getCurrentBrand()
  const user     = req.user.id
  const redirect = req.body.redirect || 'https://rechat.com/dashboard/contacts/'

  const url = await MicrosoftAuthLink.requestMicrosoftAccess(user, brand, redirect)

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

  if ( credential.user !== user )
    throw Error.BadRequest('Invalid user credential.')

  if ( credential.brand !== brand )
    throw Error.BadRequest('Invalid brand credential.')

  return res.model(credential)
}

const revokeAccess = async function (req, res) {
  const user  = req.user.id
  const brand = getCurrentBrand()

  const credential = await MicrosoftCredential.get(req.params.id)

  if ( credential.user !== user )
    throw Error.BadRequest('Invalid user credential.')

  if ( credential.brand !== brand )
    throw Error.BadRequest('Invalid brand credential.')

  if (credential.revoked)
    return res.model(credential)

  if ( credential.sync_status === 'pending' )
    throw Error.BadRequest('Please wait until current sync job finished.')

  await MicrosoftAuthLink.revokeAccess(credential.id)

  const updated_credential = await MicrosoftCredential.get(credential.id)

  return res.model(updated_credential)
}

const disableEnableSync = async function (req, res) {
  const user = req.user.id
  const brand = getCurrentBrand()

  const credential = await MicrosoftCredential.get(req.params.id)

  if ( credential.user !== user )
    throw Error.BadRequest('Invalid user credential.')

  if ( credential.brand !== brand )
    throw Error.BadRequest('Invalid brand credential.')

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

  if ( credential.user !== user )
    throw Error.BadRequest('Invalid user credential.')

  if ( credential.brand !== brand )
    throw Error.BadRequest('Invalid brand credential.')

  if ( credential.sync_status === 'pending' )
    throw Error.BadRequest('Please wait until current sync job finished.')

  if ( credential.revoked )
    throw Error.BadRequest('Your Microsoft-Account is already revoked!')

  await MicrosoftCredential.forceSync(credential.id)

  const updated_credential = await MicrosoftCredential.get(credential.id)

  return res.model(updated_credential)
}

const getGCredentialLastSyncHistory = async function (req, res) {
  const user = req.user.id
  const brand = getCurrentBrand()

  const microsoft_credential_id = req.params.id

  const history = await MicrosoftSyncHistory.getMCredentialLastSyncHistory(user, brand, microsoft_credential_id)

  if ( history.user !== user )
    throw Error.BadRequest('Invalid user credential.')

  if ( history.brand !== brand )
    throw Error.BadRequest('Invalid brand credential.')

  return res.model(history)
}



const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.post('/users/self/microsoft', auth, brandAccess, am(requestMicrosoftAccess))
  app.get('/users/self/microsoft', auth, brandAccess, am(getMicrosoftProfiles))
  app.get('/users/self/microsoft/:id', auth, brandAccess, am(getMicrosoftProfile))

  app.delete('/users/self/microsoft/:id', auth, brandAccess, am(revokeAccess))
  app.delete('/users/self/microsoft/:id/sync', auth, brandAccess, am(disableEnableSync))
  app.put('/users/self/microsoft/:id/sync', auth, brandAccess, am(disableEnableSync))

  app.post('/users/self/microsoft/:id/sync', auth, brandAccess, am(forceSync))
  
  app.get('/webhook/microsoft/grant', am(grantAccess))

  app.get('/users/self/microsoft/sync_history/:id', auth, brandAccess, am(getGCredentialLastSyncHistory))


  // test api
  app.post('/users/test/microsoft', am(requestMicrosoftAccessTest))
}

module.exports = router