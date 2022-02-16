const url = require('url')
const am = require('../utils/async_middleware.js')
const Brand = require('../models/Brand')
const config = require('../config')
const Url = require('../models/Url')
const Crypto = require('../models/Crypto')
const { scope } = require('../models/Facebook/constants')
const authenticateUser = require('../models/Facebook/auth')
const { getByUser, get } = require('../models/Facebook/pages/get')
const deleteAccount = require('../models/Facebook/pages/delete')

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
  const brandId = getCurrentBrand()
  const base = url.parse(config.facebook.baseurl)
  base.pathname = `/${config.facebook.version}/dialog/oauth`
  base.query = {
    response_type: 'code',
    auth_type: 'rerequest',
    scope,
    client_id: config.facebook.client_id,
    state: encodeURIComponent(
      JSON.stringify({
        signature: Crypto.sign(`${req.user.id}-${brandId}`).toString('base64'),
        userId: req.user.id,
        brandId,
      })
    ),
    redirect_uri: Url.api({
      uri: '/facebook/auth/done',
    }),
  }

  res.redirect(url.format(base))
}

const authDone = async (req, res) => {
  const { code, error } = req.query

  const errorType = {
    OAuthException: 'OAuthException',
    Unauthorized: 'Unauthorized',
    FacebookPageIsNotConnected: 'FacebookPageIsNotConnected',
    InstagramIsNotConnected: 'InstagramIsNotConnected',
    Unknown: 'Unknown',
  }

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
    const url = Url.web({ uri: '/dashboard', query })
    return res.redirect(url)
  }

  if (error) {
    return getRedirectionLink({ type: errorType.OAuthException, msg: error })
  }

  if (!code) {
    return getRedirectionLink({ type: errorType.OAuthException, msg: 'code is not provided' })
  }

  const state = JSON.parse(decodeURIComponent(req.query.state))

  if (
    !state.signature ||
    !state.userId ||
    !state.brandId ||
    !Crypto.verify(`${state.userId}-${state.brandId}`, Buffer.from(state.signature, 'base64'))
  ) {
    return getRedirectionLink({ type: 'Unauthorized', msg: 'invalid state params' })
  }

  try {
    await authenticateUser({
      userId: state.userId,
      brandId: state.brandId,
      code,
    })

    return getRedirectionLink()
  } catch (error) {
    let type = ''
    let msg = ''
    if (error instanceof OAuthFetchingAccessTokenException) {      
      type = errorType.OAuthException
      msg = 'error in getting access token'
    } else if (error instanceof OAuthFetchingPagesException) {
      type = errorType.OAuthException
      msg = 'error in getting pages'
    } else if (error instanceof OAuthFetchingInstagramIDException) {
      type = errorType.OAuthException
      msg = 'error in getting instagram id'
    } else if (error instanceof OAuthFetchingInstagramInfoException) {
      type = errorType.OAuthException
      msg = 'error in getting instagram info'
    } else if (error instanceof OAuthFetchingFacebookProfileException) {
      type = errorType.OAuthException
      msg = 'error in getting facebook profile'
    } else if (error instanceof FacebookPageIsNotConnectedException) {
      type = errorType.FacebookPageIsNotConnected
    } else if (error instanceof InstagramAccountIsNotConnectedException) {
      type = errorType.InstagramIsNotConnected
    } else {
      type = errorType.Unknown
    }
    return getRedirectionLink({ type, msg })
  }
}

const disconnect = async (req, res) => {
  const { facebookPageId } = req.params

  const brand = getCurrentBrand()
  const user = req.user.id

  const facebookPage = await get(facebookPageId)

  if (facebookPage.user !== user && facebookPage.brand !== brand) {
    return res.error(Error.Unauthorized())
  }

  if (facebookPage.revoked) {
    res.status(204)
    return res.end()
  }

  await deleteAccount(facebookPageId)
  res.status(204)
  return res.end()
}

const getFacebookProfiles = async (req, res) => {
  const brand = getCurrentBrand()
  const user = req.user.id
  const credentials = await getByUser(user, brand)

  return res.collection(credentials)
}

const router = function (app) {
  const auth = app.auth.bearer.middleware
  app.get('/users/self/facebook', auth, brandAccess, am(getFacebookProfiles))
  app.delete('/users/self/facebook/:facebookPageId', auth, brandAccess, am(disconnect))
  app.get('/users/self/facebook/auth', auth, brandAccess, am(requestFacebookAccess))
  app.get('/facebook/auth/done', am(authDone))
}

module.exports = router
