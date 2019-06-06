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

// how about non-gmail address?
const requestGmailAccess = async function (req, res) {
  const user  = req.user.id
  const brand = getCurrentBrand()

  await GoogleAuthLink.requestGmailAccessCheck(user, brand)

  const authLinkRecord = await GoogleAuthLink.requestGmailAccess(user, brand)

  return res.model(authLinkRecord)
}

const grantAccess = async function (req, res) {
  const code = req.query.code
  const key  = req.params.key

  // if(req.query.error === 'access_denied')
  // do sth

  if(!code)
    throw Error.BadRequest('Code is not specified.')

  if(!key)
    throw Error.BadRequest('Key is not specified.')

  const gmailRecord = await GoogleAuthLink.grantAccess(code, key)

  // return res.model(gmailRecord)

  const closeDialog = fs.readFileSync(__dirname + '/../html/google/close_dialog.html').toString()
  res.header('Content-Type', 'text/html')
  res.write(closeDialog)
  res.end()
}

const getGoogleProfile = async function (req, res) {
  const user = req.user.id
  const brand = getCurrentBrand()

  const credential = await GoogleCredential.getByUser(user, brand)

  return res.model(credential)
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

  app.post('/users/self/google', auth, brandAccess, am(requestGmailAccess))
  app.get('/users/self/google', auth, brandAccess, am(getGoogleProfile))
  app.delete('/users/self/google', auth, brandAccess, am(revokeAccess))
  
  app.get('/webhook/google/grant/:key', am(grantAccess))
}

module.exports = router