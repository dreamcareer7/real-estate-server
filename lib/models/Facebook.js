const FB = require('fb')
const config = require('../config.js')

const fb = new FB.Facebook({
  appId: config.facebook.app_id,
  appSecret: config.facebook.app_secret
})

const error_template = {
  http: 412,
  message: 'Stored Facebook Token is Invalid',
  code: 'Internal'
}
const error = Error.create.bind(null, error_template)

Facebook = {}

Facebook.share = function (options, cb) {
  // options.message  Message String
  // options.photo    Photo URL
  // options.user     User ID

  User.get(options.user, (err, user) => {
    if (err)
      return cb(err)

    if (!user.facebook_access_token)
      return cb(error('User has no access token'))

    fb.api('me/feed', 'post', {
      access_token: user.facebook_access_token,
      message: options.message,
      link: 'http://rechat.com',
      picture: options.photo
    }, (res) => {
      if (!res)
        return cb(Error.Generic())

      if (res.error) {
        if (res.error.code === 190 || res.error.code === 200)
          return cb(error(res.error.message))

        return cb(Error.Generic(res.error))
      }

      cb(null, res.id)
    })
  })
}

Facebook.getAccessToken = function (short_lived_token, cb) {
  fb.api('oauth/access_token', {
    client_id: config.facebook.app_id,
    client_secret: config.facebook.app_secret,
    grant_type: 'fb_exchange_token',
    fb_exchange_token: short_lived_token
  }, res => {
    if (!res)
      return cb(Error.Generic())

    if (res.error) {
      if (res.error.code === 190)
        return cb(error(res.error.message))

      return cb(Error.Generic(res.error))
    }

    if (!res.access_token)
      return cb(Error.Generic('Access token not found'))

    cb(null, res.access_token)
  })
}
