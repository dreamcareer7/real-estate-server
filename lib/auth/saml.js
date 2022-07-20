const MultiSamlStrategy = require('passport-saml/multiSamlStrategy')
const bodyParser = require('body-parser')
const promisify = require('../utils/promisify')
const { expect } = require('../utils/validator')
const { Parser, processors } = require('xml2js')
const SsoProvider = require('../models/User/sso')
const Context = require('../models/Context')
const Client = require('../models/Client/get')
const Url = require('../models/Url')
const User = require('../models/User')
const Brand = require('../models/Brand/get')

const parser = new Parser({
  tagNameProcessors: [processors.stripPrefix]
})

const getUser = async profile => {
  const sso = await SsoProvider.getUser(profile.issuer, profile.userid)

  if (sso) {
    const user = await User.get(sso.user)
    user.trusted = Boolean(sso.trusted_at)

    /*
    * By setting the brand, we ensure that URL's created by Url.create()
    * will have the hostname of the brand.
    * So usr get redirected to the correct/branded hostname.
    */
    const provider = await SsoProvider.get(sso.provider)

    if (provider.brand) {
      const brand = await Brand.get(provider.brand)
      Context.set({brand})
    }

    return user
  }

  const user = await User.getByEmail(profile.nameID)

  async function connectAsTrusted(id) {
    const u = await User.get(id)

    await SsoProvider.connectUser({
      user: id,
      provider: profile.issuer,
      foreign_id: profile.userid,
      trusted: true,
      brand: true,
      profile
    })

    u.trusted = true
    return u
  }

  if (!user) {
    // User doesn't exist. We need to register a new one.
    const id = await promisify(User.create)({
      first_name: profile.firstName,
      last_name: profile.lastName,
      email: profile.nameID,
      is_shadow: false,
      skip_confirmation: true,
    })

    await promisify(User.confirmEmail)(id)
    return connectAsTrusted(id)
  }

  if (user.deleted_at !== null) {
    await User.undelete(user.id)
  }

  if (user.is_shadow) {
    // Shadow user being claimed by SSO.
    // In this case we do trust SSO provider a little bit

    await promisify(User.patch)(user.id, {
      ...user,
      first_name: profile.firstName,
      last_name: profile.lastName,
      is_shadow: false
    })

    await promisify(User.confirmEmail)(user.id)

    return connectAsTrusted(user.id)
  }

  /*
   * SsoProvider.connectUser may still decide to trust this provider
   * based on it's domain name.
   */
  const trusted = await SsoProvider.connectUser({
    user: user.id,
    provider: profile.issuer,
    foreign_id: profile.userid,
    profile,
    trusted: false
  })

  user.trusted = trusted
  return user
}

const getInboundSamlOptions = async req => {
  const { SAMLResponse } = req.body
  expect(SAMLResponse).to.be.a('string')

  try {
    const string = Buffer.from(SAMLResponse, 'base64').toString('utf-8')
    const xml = await promisify(parser.parseString)(string)
    const issuer = xml.Response.Issuer[0]._

    const provider = await SsoProvider.getByIdentifier(issuer)
    const client = await Client.get(provider.client)

    req.client = client // User later by redirect function.

    return provider.config
  } catch(error) {
    Context.log(error)
    throw new Error.Validation('Invalid SAML Payload')
  }
}

const getOutboundSamlOptions = async req => {
  const provider = await SsoProvider.get(req.params.provider)

  return provider.config
}

/*
 * MultiSamlStrategy can only take 1 getSamlOptions function.
 * It's job is to take a request and determine which SAML config
 * must be used for it. However, inbound and outbound reqeusts
 * are quite different. One is a POST and one is a GET and they
 * have totally different methods of determining the provider.
 *
 * Inbound request is determined by the spec, while the outbound
 * requests is up to us tp spec out.
 *
 * So right now it takes in a request. Based on it's method (GET, POST)
 * detects if it's an inbound/outbound request and passes it
 * to the right function to do the actual provider detection.
 */

const getSamlOptions = (req, cb) => {
  const { method } = req

  if (method === 'POST')
    return getInboundSamlOptions(req).nodeify(cb)

  getOutboundSamlOptions(req).nodeify(cb)
}

const config = {
  getSamlOptions
}

const redirect = async (req, res) => {
  const { user, client } = req
  const { trusted } = user

  const { RelayState } = req.body
  const relay = RelayState ? JSON.parse(RelayState) : {}

  if (trusted) {
    const url = await User.getLoginLink({user, client, options: {
      uri: relay.uri
    }})
    res.redirect(url)
    return
  }

  const url = Url.web({
    uri: '/signin',
    query: {
      username: user.email,
      redirectTo: '/dashboard/account/sso'
    }
  })
  return res.redirect(url)
}

const strategy = new MultiSamlStrategy(config, (profile, done) => {
  getUser(profile).nodeify(done)
})

module.exports = function (app, passport) {
  passport.use(strategy)

  const urlEncoded = bodyParser.urlencoded({
    extended: true,
  })

  app.post('/auth/saml',
    urlEncoded,
    passport.authenticate('saml'),
    redirect
  )

  app.get('/auth/saml/:provider', (req, res, next) => {
    passport.authenticate('saml')(req, res, next)
  })
}
