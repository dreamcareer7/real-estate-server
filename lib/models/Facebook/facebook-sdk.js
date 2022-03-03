const request = require('request-promise-native')
const url = require('url')
const config = require('../../config.js')
const Url = require('../Url')
const { scope } = require('./constants')
const Crypto = require('../Crypto')

const {
  OAuthFetchingPagesException,
  OAuthFetchingAccessTokenException,
  OAuthFetchingInstagramIDException,
  OAuthFetchingFacebookProfileException,
  OAuthFetchingInstagramInfoException,
} = require('./errors')

const isTest = process.env.NODE_ENV === 'tests'

if (isTest) {
  require('./mock')
}

const { version, graph_url, client_id, client_secret } = config.facebook

const fbRequest = async (params) => {
  const res = await request({
    ...params,
    url: `${graph_url}/${version}/${params.url}`,
  })

  return res
}

module.exports = {
  /** @returns bool - check where state is a valid state */
  isValidState: ({ userId, brandId, signature }) => {
    let isValid = false
    if (
      signature &&
      userId &&
      brandId &&
      Crypto.verify(`${userId}-${brandId}`, Buffer.from(signature, 'base64'))
    ) {
      isValid = true
    }   
    return isValid
  },
  /** @returns string - generate auth URL */
  generateAuthUrl: ({ brandId, userId }) => {
    const base = url.parse(config.facebook.baseurl)
    base.pathname = `/${config.facebook.version}/dialog/oauth`
    base.query = {
      response_type: 'code',
      auth_type: 'rerequest',
      scope,
      client_id: config.facebook.client_id,
      state: encodeURIComponent(
        JSON.stringify({
          signature: Crypto.sign(`${userId}-${brandId}`).toString('base64'),
          userId: userId,
          brandId,
        })
      ),
      redirect_uri: Url.api({
        uri: '/facebook/auth/done',
      }),
    }

    return url.format(base)
  },
  /** @returns {Promise<string>} */
  getAccessToken: async ({ code }) => {
    try {
      const params = {
        url: 'oauth/access_token',
        method: 'GET',
        qs: {
          client_id,
          client_secret,
          redirect_uri: Url.api({
            uri: '/facebook/auth/done',
          }),
          code,
        },
        json: true,
      }

      const res = await fbRequest(params)

      return res.access_token
    } catch (error) {
      throw new OAuthFetchingAccessTokenException()
    }
  },
  init: ({ accessToken }) => {
    return {
      /** @typedef {import('./types').FacebookPage} FacebookPage */
      /** @returns {Promise<FacebookPage[]|[]>} */
      getPages: async () => {
        try {
          const params = {
            url: 'me/accounts',
            method: 'GET',
            qs: {
              access_token: accessToken,
            },
            json: true,
          }

          const res = await fbRequest(params)

          return res.data || []
        } catch (error) {
          throw new OAuthFetchingPagesException()
        }
      },
      /** @returns {Promise<string | undefined>} */
      getInstagramId: async ({ pageId }) => {
        try {
          const params = {
            url: `${pageId}`,
            method: 'GET',
            qs: {
              access_token: accessToken,
              fields: 'instagram_business_account',
            },
            json: true,
          }

          const res = await fbRequest(params)
          return res?.instagram_business_account?.id
        } catch (error) {
          throw new OAuthFetchingInstagramIDException()
        }
      },
      /** @typedef {import('./types').InstagramProfile} InstagramProfile */
      /** @returns {Promise<InstagramProfile>} */
      getInstagramInfo: async ({ igID }) => {
        try {
          const params = {
            url: `${igID}`,
            method: 'GET',
            qs: {
              access_token: accessToken,
              fields: encodeURIComponent('profile_picture_url,biography,id,username,website'),
            },
            json: true,
          }
          const res = await fbRequest(params)
          return res
        } catch (error) {
          throw new OAuthFetchingInstagramInfoException()
        }
      },
      /** @typedef {import('./types').FacebookProfile} FacebookProfile */
      /** @returns {Promise<FacebookProfile>} */
      getFacebookProfile: async () => {
        try {
          const params = {
            url: 'me',
            method: 'GET',
            qs: {
              access_token: accessToken,
              fields: 'id,first_name,last_name,email,picture',
            },
            json: true,
          }
          const res = await fbRequest(params)
          return res
        } catch (error) {
          throw new OAuthFetchingFacebookProfileException()
        }
      },
    }
  },
}
