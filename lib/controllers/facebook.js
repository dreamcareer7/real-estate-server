const Brand = require('../models/Brand')

const Facebook = {
  constants: {...require('../models/Facebook/constants') },
  authenticateUser: require('../models/Facebook/auth'),
  ...require('../models/Facebook/pages/get'),
  deleteAccount: require('../models/Facebook/pages/delete'),
  sdk: require('../models/Facebook/facebook-sdk')  
}

async function brandAccess(req, res, next) {
  await Brand.limitAccess({
    user: req.user.id,
    brand: req.params.brand,
  })
  next()
}


const requestFacebookAccess = (req, res) => {    
  const redirectedURL = Facebook.sdk.generateAuthUrl({
    brandId: req.params.brand,
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

  const brand = req.params.brand
  const user = req.user.id

  const facebookPage = await Facebook.get(facebookPageId)

  if (facebookPage.user !== user || facebookPage.brand !== brand) {
    return res.error(Error.Unauthorized())
  }

  await Facebook.deleteAccount(facebookPageId)
  res.status(204)
  return res.end()
}

const getFacebookProfiles = async (req, res) => {
  const brand = req.params.brand
  const user = req.user.id
  const credentials = await Facebook.getByUser(user, brand)

  return res.collection(credentials)
}

const router = function (app) {
  const auth = app.auth.bearer.middleware
  app.get('/brands/:brand/users/self/facebook', auth, brandAccess, getFacebookProfiles)
  app.delete('/brands/:brand/users/self/facebook/:facebookPageId', auth, brandAccess, disconnect)
  app.get('/brands/:brand/users/self/facebook/auth', auth, brandAccess, requestFacebookAccess)
  app.get('/facebook/auth/done', authDone)
}

module.exports = router
