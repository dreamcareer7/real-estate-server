const Nock = require('nock')
const config = require('../../config.js')
const fs = require('fs')
const { version, graph_url } = config.facebook
const { instagramProfiles } = require('../../../tests/functional/suites/data/facebook/fakeData')

const png = fs.readFileSync(`${__dirname}/example.png`)

// https://d2dzyv4cb7po1i.cloudfront.net/
// https://d2dzyv4cb7po1i.cloudfront.net/templates/instances/7b299bf0-98c0-11ec-9ce9-37a5860f61b8.png

Nock(config.buckets.public.cdn.url).persist().get(/.*/).reply(200, png)

const fb = Nock(`${graph_url}/${version}`)

// createMediaContainer
fb.post((uri) => uri.includes('/media?')).reply(200, (uri, requestBody, cb) => {
  // const code = getParamFromQuery(uri, 'code')
  // if (code === invalidCode) {
  //   return cb(new Error('invalid code'), [400, 'invalid code'])
  // }
  // const data = codes[code]
  cb(null, {
    id: 'test',
  })
})

// publishMedia
fb.post((uri) => uri.includes(`${instagramProfiles.insta1.id}/media_publish?`)).reply(200, {
  id: 'test',
})

// publishMedia
fb.post((uri) => uri.includes(`${instagramProfiles.insta2.id}/media_publish?`)).replyWithError({
  error: {
    error_user_msg: 'FUCK',
  },
})

fb.get((uri) => uri.includes('permalink')).reply(200, (uri, requestBody, cb) => {
  // const code = getParamFromQuery(uri, 'code')
  // if (code === invalidCode) {
  //   return cb(new Error('invalid code'), [400, 'invalid code'])
  // }
  // const data = codes[code]
  cb(null, {
    permalink: 'http://test.com',
  })
})

fb.persist()
