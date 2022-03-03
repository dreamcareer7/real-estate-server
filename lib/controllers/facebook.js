const Brand = require('../models/Brand')
const Url = require('../models/Url')

const Facebook = {
  constants: {...require('../models/Facebook/constants') },
  authenticateUser: require('../models/Facebook/auth'),
  ...require('../models/Facebook/pages/get'),
  deleteAccount: require('../models/Facebook/pages/delete'),
  sdk: require('../models/Facebook/facebook-sdk')  
}

const {
  OAuthFetchingPagesException,
  OAuthFetchingAccessTokenException,
  OAuthFetchingInstagramIDException,
  OAuthFetchingFacebookProfileException,
  OAuthFetchingInstagramInfoException,
  FacebookPageIsNotConnectedException,
  InstagramAccountIsNotConnectedException,
} = require('../models/Facebook/errors')

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
  const { code, error } = req.query
  
  const getRedirectionLink = ({ type, msg }) => {
    let query
    if (type) {
      query = {
        error: type,
      }

      if (msg) {
        query = {
          ...query,
          msg,
        }
      }     
    }
    
    const url = Url.web({ uri: '/api/facebook/auth-result', query })
    return res.redirect(url)
  }

  if (error) {
    return getRedirectionLink({ type: Facebook.constants.errorType.OAuthException, msg: error })
  }

  if (!code) {
    return getRedirectionLink({ type: Facebook.constants.errorType.OAuthException, msg: 'code is not provided' })
  }

  const state = JSON.parse(decodeURIComponent(req.query.state))

  if (
    !Facebook.sdk.isValidState(state)
  ) {
    return getRedirectionLink({ type: 'Unauthorized', msg: 'invalid state params' })
  }
 
  try {
    await Facebook.authenticateUser({
      userId: state.userId,
      brandId: state.brandId,
      code,
    })

    return getRedirectionLink()
  } catch (error) {
    let type = ''
    let msg = ''
    if (error instanceof OAuthFetchingAccessTokenException) {      
      type = Facebook.constants.errorType.OAuthException
      msg = 'error in getting access token'
    } else if (error instanceof OAuthFetchingPagesException) {
      type = Facebook.constants.errorType.OAuthException
      msg = 'error in getting pages'
    } else if (error instanceof OAuthFetchingInstagramIDException) {
      type = Facebook.constants.errorType.OAuthException
      msg = 'error in getting instagram id'
    } else if (error instanceof OAuthFetchingInstagramInfoException) {
      type = Facebook.constants.errorType.OAuthException
      msg = 'error in getting instagram info'
    } else if (error instanceof OAuthFetchingFacebookProfileException) {
      type = Facebook.constants.errorType.OAuthException
      msg = 'error in getting facebook profile'
    } else if (error instanceof FacebookPageIsNotConnectedException) {
      type = Facebook.constants.errorType.FacebookPageIsNotConnected
    } else if (error instanceof InstagramAccountIsNotConnectedException) {
      type = Facebook.constants.errorType.InstagramIsNotConnected
    } else {
      type = Facebook.constants.errorType.Unknown
    }
    return getRedirectionLink({ type, msg })
  }
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
