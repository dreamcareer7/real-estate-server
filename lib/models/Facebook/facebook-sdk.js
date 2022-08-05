const request = require('request-promise-native')
const url = require('url')
const Context = require('../Context')
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
  SocialPostError,
} = require('./errors')

const isTest = process.env.NODE_ENV === 'tests'

if (isTest) {
  require('./mock')
}

const { version, graph_url, client_id, client_secret } = config.facebook

const fbRequest = async (params) => {
  return request({
    ...params,
    url: `${graph_url}/${version}/${params.url}`,
  })
}

const parseSocialPostError = (err) => {
  let msg
  if (err?.error?.error?.type === 'OAuthException') {
    msg = err?.error?.error?.error_user_msg || err?.error?.error?.message
  }
  
  if (msg) {
    return new SocialPostError(msg)
  }
  return err
}

module.exports = {
  validateAndParseState: (state) => {
    let isValid = false
    let userId
    let brandId

    try {
      const jsonState = JSON.parse(decodeURIComponent(state))
      const { signature } = jsonState

      userId = jsonState.userId
      brandId = jsonState.brandId

      if (
        signature &&
        userId &&
        brandId &&
        Crypto.verify(`${userId}-${brandId}`, Buffer.from(signature, 'base64'))
      ) {
        isValid = true
      }
    } catch (error) {
      Context.log(`there is an error while parsing facebook state: ${state}`)
      Context.error(error)
      isValid = false
    }
    return { isValid, userId, brandId }
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
      Context.log('Getting access token from FB')
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
      Context.log('Getting access token from FB Failed')
      Context.error(error)
      throw new OAuthFetchingAccessTokenException()
    }
  },
  init: ({ accessToken }) => {
    return {
      /** @typedef {import('./types').FacebookPage} FacebookPage */
      /** @returns {Promise<FacebookPage[]|[]>} */
      getPages: async () => {
        try {
          Context.log('Getting pages from FB')
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
          Context.log('Getting pages from FB Failed')
          Context.error(error)
          throw new OAuthFetchingPagesException()
        }
      },
      /** @returns {Promise<string | undefined>} */
      getInstagramId: async ({ pageId }) => {
        try {
          Context.log('Getting Instagram Id')
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
          Context.log('Getting Instagram Id Failed')
          Context.error(error)
          throw new OAuthFetchingInstagramIDException()
        }
      },
      /** @typedef {import('./types').InstagramProfile} InstagramProfile */
      /** @returns {Promise<InstagramProfile>} */
      getInstagramInfo: async ({ igID }) => {
        try {
          Context.log('Getting Instagram info')
          const params = {
            url: `${igID}`,
            method: 'GET',
            qs: {
              access_token: accessToken,
              fields: 'profile_picture_url,biography,id,username,website',
            },
            json: true,
          }
          return fbRequest(params)
        } catch (error) {
          Context.log('Getting Instagram info Failed')
          Context.error(error)
          throw new OAuthFetchingInstagramInfoException()
        }
      },
      /** @typedef {import('./types').FacebookProfile} FacebookProfile */
      /** @returns {Promise<FacebookProfile>} */
      getFacebookProfile: async () => {
        try {
          Context.log('Getting facebook profile')
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
          Context.log('Getting facebook profile Failed')
          Context.error(error)
          throw new OAuthFetchingFacebookProfileException()
        }
      },
      /** @returns {Promise<string>} */
      createMediaContainer: async ({ igUserId, imageURL, caption }) => {
        // https://developers.facebook.com/docs/instagram-api/reference/ig-user/media#creating
        // https://developers.facebook.com/docs/instagram-api/reference/error-codes
        try {
          const params = {
            url: `${igUserId}/media`,
            method: 'post',
            qs: {
              access_token: accessToken,
              image_url: imageURL,
              caption,
            },
            json: true,
          }
          const res = await fbRequest(params)
          return res.id
        } catch (err) {
          Context.log('Creating media container Failed')
          throw parseSocialPostError(err)
        }
      },
      /** @returns {Promise<string>} */
      publishMedia: async ({ igUserId, mediaContainerId }) => {
        // https://developers.facebook.com/docs/instagram-api/reference/ig-user/media_publish#creating
        try {
          const params = {
            url: `${igUserId}/media_publish`,
            method: 'post',
            qs: {
              access_token: accessToken,
              creation_id: mediaContainerId,
            },
            json: true,
          }
          const res = await fbRequest(params)
          return res.id
        } catch (err) {
          Context.log('publishing media failed')
          throw parseSocialPostError(err)
        }
      },
      /** @returns {Promise<string>} */
      getMediaInfo: async ({ publishedMediaContainerId }) => {
        // https://developers.facebook.com/docs/instagram-api/reference/ig-media
        try {
          const params = {
            url: publishedMediaContainerId,
            method: 'get',
            qs: {
              access_token: accessToken,
              fields: 'permalink',
            },
            json: true,
          }
          const res = await fbRequest(params)
          return res.permalink
        } catch (err) {
          Context.log('Getting media info Failed')
          throw parseSocialPostError(err)
        }
      },
    }
  },
}
