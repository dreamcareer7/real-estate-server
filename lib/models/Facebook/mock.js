const Nock = require('nock')
const config = require('../../config.js')
const { version, graph_url } = config.facebook
const url = require('url')
const nock = Nock(`${graph_url}/${version}`)

const {
  codes,
  facebookData,
  instagramProfiles,
  invalidCode
} = require('../../../tests/functional/suites/data/facebook/fakeData')

const getParamFromQuery = (uri, param) => {
  const value = url.parse(uri, true).query[param]
  return value
}

// getAccessToken
nock
  .get((uri) => uri.includes('oauth/access_token'))
  .reply(200, (uri, requestBody, cb) => {
    const code = getParamFromQuery(uri, 'code')
    if (code === invalidCode) {
      return cb(new Error('invalid code'), [400, 'invalid code'])
    }
    const data = codes[code]
    cb(null, {
      access_token: data,
    })
  })

// getPages
nock
  .get((uri) => uri.includes('me/accounts'))
  .reply(200, (uri, requestBody, cb) => {
    const accessToken = getParamFromQuery(uri, 'access_token')
    const targetData = facebookData[accessToken]
    cb(null, {
      data: targetData.pages.data.map((r) => r.page),
    })
  })

//getFacebookProfile
nock
  .get((uri) => uri.includes('/me'))
  .reply(200, (uri, requestBody, cb) => {
    const accessToken = getParamFromQuery(uri, 'access_token')
    const data = facebookData[accessToken]
    cb(null, data.facebookProfile)
  })

//getInstagramId
nock
  .get((uri) => uri.includes('instagram_business_account'))
  .reply(200, (uri, requestBody, cb) => {
    // getting pageId from the URL
    // the url is something like this /v12.0/1321654
    const pageId = url.parse(uri, true).pathname?.split('/')[2]
    const accessToken = getParamFromQuery(uri, 'access_token')
    const targetData = facebookData[accessToken]
    const targetPage = targetData.pages.data.find((p) => p.page.id === pageId)
    cb(
      null,
      targetPage.instaId && {
        instagram_business_account: {
          id: targetPage.instaId,
        },
      }
    )
  })

//getInstagramInfo
nock
  .get((uri) => uri.includes('profile_picture_url'))
  .reply(200, (uri, requestBody, cb) => {
    // getting instagramId from the URL
    // the url is something like this /v12.0/1321654
    const instId = url.parse(uri, true).pathname?.split('/')[2]
    // const accessToken = getParamFromQuery(uri, 'access_token')
    const targetInstagramPage = instagramProfiles[instId]
    cb(null, targetInstagramPage)
  })

//getMediaContainerStatus
nock
  .get((uri) => uri.includes('status_code'))
  .reply(200, (uri, requestBody, cb) => {
 
    cb(null, {
      status_code: 'FINISHED'
    })
  })

nock.persist()
