const Brand = require('../models/Brand')

const Facebook = {
  constants: {...require('../models/Facebook/constants') },
  authenticateUser: require('../models/Facebook/auth'),
  ...require('../models/Facebook/pages/get'),
  deleteAccount: require('../models/Facebook/pages/delete'),
  sdk: require('../models/Facebook/facebook-sdk')  
}

function getCurrentBrand() {
  const brand = Brand.getCurrent()

  if (!brand || !brand.id) {
    throw Error.BadRequest('Brand is not specified.')
  }

  return brand.id
}

function brandAccess(req, res, next) {
  const brand = getCurrentBrand()
  const user = req.user.id

  return Brand.limitAccess({ user, brand }).nodeify((err) => {
    if (err) {
      return res.error(err)
    }

    next()
  })
}

const requestFacebookAccess = (req, res) => {    
  const redirectedURL = Facebook.sdk.generateAuthUrl({
    brandId: getCurrentBrand(),
    userId: req.user.id
  })    
  res.redirect(redirectedURL)
}

const authDone = async (req, res) => {
  const { code, error, state } = req.query  

  const url = await Facebook.authenticateUser({
    error,
    state,
    code,
  })
  
  return res.redirect(url)
}

const disconnect = async (req, res) => {
  const { facebookPageId } = req.params

  const brand = getCurrentBrand()
  const user = req.user.id

  const facebookPage = await Facebook.get(facebookPageId)

  if (facebookPage.user !== user || facebookPage.brand !== brand) {
    return res.error(Error.Unauthorized())
  }

  if (facebookPage.revoked) {
    res.status(204)
    return res.end()
  }

  await Facebook.deleteAccount(facebookPageId)
  res.status(204)
  return res.end()
}

const getFacebookProfiles = async (req, res) => {
  const brand = getCurrentBrand()
  const user = req.user.id
  const credentials = await Facebook.getByUser(user, brand)

  return res.collection(credentials)
}

const router = function (app) {
  const auth = app.auth.bearer.middleware
  app.get('/users/self/facebook', auth, brandAccess, getFacebookProfiles)
  app.delete('/users/self/facebook/:facebookPageId', auth, brandAccess, disconnect)
  app.get('/users/self/facebook/auth', auth, brandAccess, requestFacebookAccess)
  app.get('/facebook/auth/done', authDone)
}

module.exports = router
