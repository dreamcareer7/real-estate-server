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

  console.log(req.body)

  if(!email)
    throw Error.BadRequest('Email is not specified.')

  // if( email is not a gmail-address )
  //   throw Error.BadRequest('Email is not a valid gmail address.')

  const link = await GmailAuthLink.requestGmailAccess(user, brand, email)
  const authLinkRecord = await GmailAuthLink.getByLink(link)

  return res.model(authLinkRecord)
}

const grantAccess = async function (req, res) {
  const code     = req.query.code
  const recordId = req.params.recordId

  if(!code)
    throw Error.BadRequest('Code is not specified.')

  if(!recordId)
    throw Error.BadRequest('RecordId is not specified.')

  const gmailRecord = await GmailAuthLink.grantAccess(code, recordId)
  console.log('CTLs - gmailRecord', gmailRecord)

  return res.model(gmailRecord)
}

const revokeAccess = async function (req, res) {
  const user = req.user.id
  const brand = getCurrentBrand()

}


const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.post('/users/self/google', auth, brandAccess, am(requestGmailAccess))

  app.get('/webhook/google/grant/:recordId', am(grantAccess))

  app.delete('/users/self/google', auth, brandAccess, am(revokeAccess))
}

module.exports = router