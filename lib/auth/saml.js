const MultiSamlStrategy = require('passport-saml/multiSamlStrategy')
const bodyParser = require('body-parser')
const promisify = require('../utils/promisify')
const { expect } = require('../utils/validator')
const parser = new (require('xml2js').Parser)

const getUser = async profile => {
  try {
    const sso = await User.getBySso(profile.issuer, profile.userid)

    return await User.get(sso.user)
  } catch(e) {
    if (e.http !== 404)
      throw e
  }

  // User doesn't exist. We need to register a new one.
  const id = await promisify(User.create)({
    first_name: profile.firstName,
    last_name: profile.lastName,
    email: profile.login,
    is_shadow: true,
    skip_confirmation: true,
    password: Math.random().toString()
  })

  const user = await User.get(id)

  User.connectSso({
    user: user.id,
    source: profile.issuer,
    foreign_id: profile.userid,
    profile
  })

  return user
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

  if (user.is_shadow) {
    const url = await User.getActivationLink({
      user: req.user
    })

    res.redirect(url)
    return
  }

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
