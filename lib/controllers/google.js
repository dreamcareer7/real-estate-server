const am = require('../utils/async_middleware.js')
const expect = require('../utils/validator.js').expect

const Brand = require('../models/Brand')
const GmailAuthLink = require('../models/Google/gmail_auth_link')



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

const requestGmailAccess = async function (req, res) {
  const user  = req.user.id
  const brand = getCurrentBrand()
  const email = req.body.email

  await GmailAuthLink.requestGmailAccessCheck(user, brand, email)

  if(!email)
    throw Error.BadRequest('Email is not specified.')

  // if( email is not a gmail-address )
  //   throw Error.BadRequest('Email is not a valid gmail address.')

  const authLinkRecord = await GmailAuthLink.requestGmailAccess(user, brand, email)

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

  const gmailRecord = await GmailAuthLink.grantAccess(code, key)

  return res.model(gmailRecord)
}

const revokeAccess = async function (req, res) {
  const user = req.user.id
  const brand = getCurrentBrand()

  await GmailAuthLink.grantAccess(user, brand)

  res.status(204)
  return res.end()
}



const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.post('/users/self/google', auth, brandAccess, am(requestGmailAccess))
  app.get('/webhook/google/grant/:key', am(grantAccess))
  app.delete('/users/self/google', auth, brandAccess, am(revokeAccess))
}

module.exports = router