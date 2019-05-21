const am = require('../utils/async_middleware.js')
const expect = require('../utils/validator.js').expect

const Brand = require('../models/Brand')
const Gmail = require('../models/Google/gmail')
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
  const user = req.user.id
  const brand = getCurrentBrand()

}

const grantAccess = async function (req, res) {

}

const revokeAccess = async function (req, res) {
  const user = req.user.id
  const brand = getCurrentBrand()

}


const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.post('/users/self/google', auth, brandAccess, am(requestGmailAccess))

  app.get('/webhook/google/grant', am(grantAccess))

  app.delete('/users/self/google', auth, brandAccess, am(revokeAccess))
}

module.exports = router