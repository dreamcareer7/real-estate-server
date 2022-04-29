const { createBrands, switchBrand } = require('../util')
const brandSetup = require('./data/facebook/brand')
const { codes, facebookData, instagramProfiles, invalidCode } = require('./data/facebook/fakeData')

const url = require('url')
const F = frisby.create.bind(frisby)
const R = () => results.facebook
const theBrand = () => R().brands.data[0].id

const validCode = 'validCode'
const validCode2 = 'validCode2'
const validCodeForUpsert = 'validCodeForUpsert'
const emptyFacebookPage = 'emptyFacebookPage'
const emptyInstagram = 'emptyInstagram'

const getFakeDataByFacebookCode = (targetCodes) => {
  const validData = []

  for (let i = 0; i < targetCodes.length; i++) {
    const targetCode = targetCodes[i]
    const accessToken = codes[targetCode]
    const fbDataForThisAccessToken = facebookData[accessToken]

    for (let index = 0; index < fbDataForThisAccessToken.pages.data.length; index++) {
      const row = fbDataForThisAccessToken.pages.data[index]
      if (row.instaId) {
        const insta = instagramProfiles[row.instaId]

        validData.push({
          facebook_page_id: row.page.id,
          revoked: false,
          deleted_at: null,
          facebook_access_token: accessToken,
          instagram_profile_picture_url: insta.profile_picture_url,
          instagram_username: insta.username,
          instagram_business_account_id: insta.id,
          name: row.page.name,
        })
      }
    }
  }

  return validData
}

const compareData = (dbData, validData) => {
  if (dbData.length !== validData.length) {
    throw new Error(`expect ${validData.length} instagram pages but got ${dbData.length}`)
  }

  for (let index = 0; index < dbData.length; index++) {
    const dbRow = dbData[index]
    const validRow = validData.find((v) => v.facebook_page_id === dbRow.facebook_page_id)

    if (!validRow) {
      throw new Error(`invalid page id ${dbRow.facebook_page_id} `)
    }

    if (validRow.deleted_at !== dbRow.deleted_at) {
      throw new Error(`expect deleted_at ${validRow.deleted_at} but got ${dbRow.deleted_at}`)
    }

    if (validRow.facebook_page_id !== dbRow.facebook_page_id) {
      throw new Error(
        `expect facebook_page_id ${validRow.facebook_page_id} but got ${dbRow.facebook_page_id}`
      )
    }

    if (validRow.revoked !== dbRow.revoked) {
      throw new Error(`expect revoked ${validRow.revoked} but got ${dbRow.revoked}`)
    }

    // if (validRow.facebook_access_token !== dbRow.facebook_access_token) {
    //   throw new Error(
    //     `expect facebook_access_token ${validRow.facebook_access_token} but got ${dbRow.facebook_access_token}`
    //   )
    // }

    if (!dbRow.instagram_profile_picture_url) {
      throw new Error(
        `expect instagram_profile_picture_url ${validRow.instagram_profile_picture_url} not be null`
      )
    }

    if (!dbRow.instagram_profile_picture_file) {
      throw new Error(
        `expect instagram_profile_picture_file ${validRow.instagram_profile_picture_url} not be null`
      )
    }

    if (validRow.instagram_username !== dbRow.instagram_username) {
      throw new Error(
        `expect instagram_username ${validRow.instagram_username} but got ${dbRow.instagram_username}`
      )
    }

    if (validRow.instagram_business_account_id !== dbRow.instagram_business_account_id) {
      throw new Error(
        `expect instagram_business_account_id ${validRow.instagram_business_account_id} but got ${dbRow.instagram_business_account_id}`
      )
    }

    if (validRow.name !== dbRow.name) {
      throw new Error(`expect name ${validRow.name} but got ${dbRow.name}`)
    }
  }
}

function requestFacebookAccess(cb) {  
  return F('request facebook access')
    .get(`/brands/${theBrand()}/users/self/facebook/auth`, {
      followRedirect: false,
    })
    .after((err, res, body) => {
      R().redirectedURL = res.headers.location
      cb(err, res, body)
    })
    .expectStatus(302)
}

function authDone(cb) {
  const parsedURL = url.parse(R().redirectedURL, true)

  return F('request facebook access')
    .get(`/facebook/auth/done?state=${parsedURL.query.state}&code=${validCode}`, {
      followRedirect: false,
    })
    .after(cb)
    .expectStatus(302)
}

function connectAnotherFacebookAccount(cb) {
  const parsedURL = url.parse(R().redirectedURL, true)

  return F('connect another valid facebook account')
    .get(`/facebook/auth/done?state=${parsedURL.query.state}&code=${validCode2}`, {
      followRedirect: false,
    })
    .after(cb)
    .expectStatus(302)
}

function getInstagramProfiles(cb) {
  return F('get instagram profiles from multi facebook accounts')
    .get(`/brands/${theBrand()}/users/self/facebook`)
    .after((err, res, body) => {
      const validData = getFakeDataByFacebookCode([validCode, validCode2])
      compareData(body.data, validData)
      cb(err, res, body)
    })
    .expectStatus(200)
}

function updateFacebookPermissions(cb) {
  const parsedURL = url.parse(R().redirectedURL, true)

  return F('update facebook permissions')
    .get(`/facebook/auth/done?state=${parsedURL.query.state}&code=${validCodeForUpsert}`, {
      followRedirect: false,
    })
    .after(cb)
    .expectStatus(302)
}

function getInstagramProfilesAfterUpdatingPermissions(cb) {
  return F('get instagram profiles after updating permissions')
    .get(`/brands/${theBrand()}/users/self/facebook`)
    .after((err, res, body) => {
      const validData = getFakeDataByFacebookCode([validCode2, validCodeForUpsert])
      compareData(body.data, validData)
      cb(err, res, body)
    })
    .expectStatus(200)
}

function disconnect(cb) {
  return F('disconnect instagram account')
    .delete(`/brands/${theBrand()}/users/self/facebook/${R().getInstagramProfilesAfterUpdatingPermissions.data[0].id}`)
    .after(cb)
    .expectStatus(204)
}

function getInstagramProfilesAfterDisconnecting(cb) {
  return F('get instagram profiles after disconnecting')
    .get(`/brands/${theBrand()}/users/self/facebook`)
    .after((err, res, body) => {
      const deletedId = R().getInstagramProfilesAfterUpdatingPermissions.data[0].id
      const rowThatShouldHaveRemoved = body.data.find((r) => r.id === deletedId)
      if (rowThatShouldHaveRemoved) {
        throw new Error(`expect page id ${deletedId} was removed`)
      }      
      cb(err, res, body)
    })
    .expectStatus(200)
}

function authDoneErrorWithInvalidCode(cb) { 
  const parsedURL = url.parse(R().redirectedURL, true)

  return F('expect get access error with invalid code')
    .get(`/facebook/auth/done?state=${parsedURL.query.state}&code=${invalidCode}`, {
      followRedirect: false,
    })
    .after((err, res, body) => {
      console.log(res.headers)
      const { error } = url.parse(res.headers.location, true).query
      if (error !== 'OAuthException') {
        throw new Error('expect get OAuthException')
      }
      cb(err, res, body)
    })
    .expectStatus(302)
}

function authDoneWithFacebookError(cb) {  
  const parsedURL = url.parse(R().redirectedURL, true)

  return F('expect get permission error when user does not give permission to rechat app')
    .get(`/facebook/auth/done?state=${parsedURL.query.state}`, {
      followRedirect: false,
    })
    .after((err, res, body) => {
      const { error } = url.parse(res.headers.location, true).query
      if (error !== 'OAuthException') {
        throw new Error('expect get OAuthException error')
      }
      cb(err, res, body)
    })
    .expectStatus(302)
}


function facebookPageIsNotConnected(cb) {
  const parsedURL = url.parse(R().redirectedURL, true)

  return F('expect error when facebook page is not connected')
    .get(`/facebook/auth/done?state=${parsedURL.query.state}&code=${emptyFacebookPage}`, {
      followRedirect: false,
    })
    .after((err, res, body) => {
      const { error } = url.parse(res.headers.location, true).query
      if (error !== 'FacebookPageIsNotConnected') {
        throw new Error('expect get FacebookPageIsNotConnected error')
      }
      cb(err, res, body)
    })
    .expectStatus(302)
}

function instagramIsNotConnected(cb) {
  const parsedURL = url.parse(R().redirectedURL, true)

  return F('expect error when insagram is not connected')
    .get(`/facebook/auth/done?state=${parsedURL.query.state}&code=${emptyInstagram}`, {
      followRedirect: false,
    })
    .after((err, res, body) => {
      const { error } = url.parse(res.headers.location, true).query
      if (error !== 'InstagramIsNotConnected') {
        throw new Error('expect get InstagramIsNotConnected error')
      }
      cb(err, res, body)
    })
    .expectStatus(302)
}

module.exports = {
  brands: createBrands('create brands', brandSetup, (response) => response.data[0].id),
  ...switchBrand(theBrand, {
    requestFacebookAccess,
    authDone,
    connectAnotherFacebookAccount,
    getInstagramProfiles,
    updateFacebookPermissions,
    getInstagramProfilesAfterUpdatingPermissions,
    disconnect,
    getInstagramProfilesAfterDisconnecting,
    authDoneErrorWithInvalidCode,
    authDoneWithFacebookError,
    facebookPageIsNotConnected,
    instagramIsNotConnected
  }),
}
