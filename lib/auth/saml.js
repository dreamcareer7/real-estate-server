const MultiSamlStrategy = require('passport-saml/multiSamlStrategy')
const bodyParser = require('body-parser')
const promisify = require('../utils/promisify')
const { expect } = require('../utils/validator')
const parser = new (require('xml2js').Parser)
const SsoProvider = require('../models/User/sso.js')

const getUser = async profile => {
  const sso = await SsoProvider.getUser(profile.issuer, profile.userid)

  if (sso)
    return await User.get(sso.user)

  const user = await User.getByEmail(profile.login)

  if (!user) {
    // User doesn't exist. We need to register a new one.
    const id = await promisify(User.create)({
      first_name: profile.firstName,
      last_name: profile.lastName,
      email: profile.login,
      is_shadow: false,
      skip_confirmation: true,
    })

    const user = await User.get(id)

    await User.connectSso({
      user: user.id,
      provider: profile.issuer,
      foreign_id: profile.userid,
      profile
    })

    return user
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

    await User.connectSso({
      user: user.id,
      provider: profile.issuer,
      foreign_id: profile.userid,
      profile
    })

    return await User.get(user.id)
  }

  // TODO: CLAIM USER PROCESS
}

const _getSamlOptions = async req => {
  const { SAMLResponse } = req.body
  expect(SAMLResponse).to.be.a('string')

  try {
    const string = Buffer.from(SAMLResponse, 'base64').toString('utf-8')
    const xml = await promisify(parser.parseString)(string)
    const issuer = xml['saml2p:Response']['saml2:Issuer'][0]._

    const provider = await User.getSsoProviderByIdentifier(issuer)
    const client = await Client.get(provider.client)

    req.client = client // User later by redirect function.

    return provider.config
  } catch(error) {
    Context.log(error)
    throw new Error.Validation('Invalid SAML Payload')
  }
}

const getSamlOptions = (req, cb) => _getSamlOptions(req).nodeify(cb)

const config = {
  getSamlOptions
}

const redirect = async (req, res) => {
  const { user, client } = req

  const url = await User.getLoginLink(user, client)
  res.redirect(url)
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
}
