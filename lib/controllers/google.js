const am = require('../utils/async_middleware.js')

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
  const url      = await GoogleAuthLink.requestGmailAccess('9fdcdf2a-8e0f-11e9-988e-0a95998482ac', '0237f9a8-8e0f-11e9-9a0e-0a95998482ac', 'redirect')

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

const getGoogleProfiles = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id

  const credentials = await GoogleCredential.getByUser(user, brand)

  return res.collection(credentials)
}

const getGoogleProfile = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id

  if(!req.params.id)
    throw Error.BadRequest('Id is not specified.')

  const credential = await GoogleCredential.get(req.params.id)

  if ( credential.user !== user )
    throw Error.BadRequest('Invalid sser credential.')

  if ( credential.brand !== brand )
    throw Error.BadRequest('Invalid brand credential.')

  return res.model(credential)
}

const revokeAccess = async function (req, res) {
  const user = req.user.id
  const brand = getCurrentBrand()

  if(!req.body.id)
    throw Error.BadRequest('Id is not specified.')

  const credential = await GoogleCredential.get(req.body.id)

  if ( credential.user !== user )
    throw Error.BadRequest('Invalid sser credential.')

  if ( credential.brand !== brand )
    throw Error.BadRequest('Invalid brand credential.')

  await GoogleAuthLink.revokeAccess(credential.id)

  return res.status(204).end()
}

const diableSync = async function (req, res) {
  const user = req.user.id
  const brand = getCurrentBrand()

  if(!req.body.id)
    throw Error.BadRequest('Id is not specified.')

  const credential = await GoogleCredential.get(req.body.id)

  if ( credential.user !== user )
    throw Error.BadRequest('Invalid sser credential.')

  if ( credential.brand !== brand )
    throw Error.BadRequest('Invalid brand credential.')

  await GoogleAuthLink.diableSync(credential.id)

  return res.status(204).end()
}


const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.post('/users/self/google', auth, brandAccess, am(requestGmailAccess))
  app.get('/users/self/google', auth, brandAccess, am(getGoogleProfiles))
  app.get('/users/self/google/:id', auth, brandAccess, am(getGoogleProfile))

  app.delete('/users/self/google/:id/sync', auth, brandAccess, am(diableSync))
  app.delete('/users/self/google/:id', auth, brandAccess, am(revokeAccess))
  
  app.get('/webhook/google/grant', am(grantAccess))


  // test api
  app.post('/users/test/google', am(requestGmailAccessTest))
}

module.exports = router