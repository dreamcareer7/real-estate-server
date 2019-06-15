const config = require('../config')
const am     = require('../utils/async_middleware.js')

const Brand = require('../models/Brand')
const GoogleAuthLink   = require('../models/Google/auth_link')
const GoogleCredential = require('../models/Google/credential')



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

const requestGmailAccessTest = async function (req, res) {
  const redirect = 'http://localhost:3078/dashboard/contacts?letter&s=0'
  const url      = await GoogleAuthLink.requestGmailAccess('9fdcdf2a-8e0f-11e9-988e-0a95998482ac', '0237f9a8-8e0f-11e9-9a0e-0a95998482ac', )

  return res.json({
    'code': 'OK',
    'data': {
      'url': url,
      'redirect': redirect,
      'type': 'google_auth_link'
    }
  })
}

const requestGmailAccess = async function (req, res) {
  const brand    = getCurrentBrand()
  const user     = req.user.id
  const redirect = req.body.redirect || 'https://rechat.com/dashboard/contacts/'

  if ( !await GoogleAuthLink.requestGmailAccessCheck(user, brand) )
    return res.status(204).end()

  const url = await GoogleAuthLink.requestGmailAccess(user, brand, redirect)

  return res.json({
    'code': 'OK',
    'data': {
      'url': url,
      'redirect': redirect,
      'type': 'google_auth_link'
    }
  })
}

const grantAccess = async function (req, res) {  
  if(req.query.error === 'access_denied')
    return res.redirect('https://rechat.com/dashboard')

  if(!req.query.code)
    throw Error.BadRequest('Code is not specified.')

  if(!req.query.state)
    throw Error.BadRequest('State is not specified.')

  if(!req.query.scope)
    throw Error.BadRequest('Scope is not specified.')

  const { redirect } = await GoogleAuthLink.grantAccess(req.query)

  // const closeDialog = fs.readFileSync(__dirname + '/../html/google/close_dialog.html').toString()
  // res.header('Content-Type', 'text/html')
  // res.write(closeDialog)
  // res.end()

  res.writeHead(302, { 'Location': redirect })
  res.end()
}

const getGoogleProfile = async function (req, res) {
  const user  = req.user.id
  const brand = getCurrentBrand()

  const credential = await GoogleCredential.getByUser(user, brand)

  return res.model(credential)
}
  
const getGoogleCredentialScopes = async function (req, res) {
  const user  = req.user.id
  const brand = getCurrentBrand()

  const credential = await GoogleCredential.getByUser(user, brand)
  const scopes = []

  if ( credential.scope.includes(config.google_scopes_map.default[0]) && credential.scope.includes(config.google_scopes_map.default[1]) )
    scopes.push('default')

  if ( credential.scope.includes(config.google_scopes_map.gmailReadOnly) )
    scopes.push('gmail.readonly')

  if ( credential.scope.includes(config.google_scopes_map.contactsReadOnly) )
    scopes.push('contacts.readonly')

  return res.json({
    code: 'OK',
    data: {
      scopes: scopes
    }
  })
}

const revokeAccess = async function (req, res) {
  const user = req.user.id
  const brand = getCurrentBrand()

  await GoogleAuthLink.revokeAccess(user, brand)

  res.status(204)
  return res.end()
}


const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.post('/users/test/google', am(requestGmailAccessTest))

  app.post('/users/self/google', auth, brandAccess, am(requestGmailAccess))
  app.get('/users/self/google', auth, brandAccess, am(getGoogleProfile))
  app.get('/users/self/google/scopes', auth, brandAccess, am(getGoogleCredentialScopes))
  app.delete('/users/self/google', auth, brandAccess, am(revokeAccess))
  
  app.get('/webhook/google/grant', am(grantAccess))
}

module.exports = router