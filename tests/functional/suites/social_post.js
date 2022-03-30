const { createBrands, switchBrand } = require('../util')
const brandSetup = require('./data/social_post/brand')
// const { codes, facebookData, instagramProfiles, invalidCode } = require('./data/facebook/fakeData')

const url = require('url')
const F = frisby.create.bind(frisby)
const R = () => results.social_post
const theBrand = () => R().brands.data[0].id

const validCode = 'validCode'

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

function getInstagramProfiles(cb) {
  return F('get instagram profiles from multi facebook accounts')
    .get(`/brands/${theBrand()}/users/self/facebook`)
    .after((err, res, body) => {
      cb(err, res, body)
    })
    .expectStatus(200)
}

function getTemplate(cb) {
  return F('get templates')
    .get(`/brands/${theBrand()}/templates?types[]=JustSold&mediums[]=Social`)
    .after(cb)
    .expectStatus(200)
}

function instantiateTemplate(cb) {
  const id = R().getTemplate.data[0].template.id
  const html = '<div>fakeTemplateInstance</div>'

  const data = {
    html,
    deals: [],
    listings: [],
    contacts: [],
  }

  return F('create an instance of a template')
    .post(`/templates/${id}/instances`, data)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        html,
      },
    })
}

function scheduleInstagramPost(cb) {
  const facebookPage = R().getInstagramProfiles.data[0].id
  const user = R().getInstagramProfiles.data[0].user
  const templateInstance = R().instantiateTemplate.data.id

  return F('schedule instagram post')
    .post(`/brands/${theBrand()}/social-post?associations[]=social_post.template_instance&associations[]=social_post.owner`, {
      facebookPage,
      templateInstance,
      due_at: new Date(new Date().getTime() - 10 * 60 * 1000).toISOString(),
      caption: 'test',
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        caption: 'test',
        facebook_page: facebookPage,
        template_instance: {
          id: templateInstance
        },
        created_by: user,
        owner: {
          id: user
        }
      },
    })
}

function scheduleAnotherInstagramPost(cb) {
  const facebookPage = R().getInstagramProfiles.data[0].id
  const templateInstance = R().instantiateTemplate.data.id

  return F('schedule instagram post for testing update api')
    .post(`/brands/${theBrand()}/social-post`, {
      facebookPage,
      templateInstance,
      due_at: new Date(new Date().getTime() - 10 * 60 * 1000),
      caption: 'this post should not be executed now',
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        caption: 'this post should not be executed now',
        facebook_page: facebookPage
      },
    })
}

function scheduleAnotherInstagramPostForTestingFailedJob(cb) {
  const facebookPage = R().getInstagramProfiles.data[1].id
  const templateInstance = R().instantiateTemplate.data.id

  return F('schedule instagram post for testing failed job')
    .post(`/brands/${theBrand()}/social-post`, {
      facebookPage,
      templateInstance,
      due_at: new Date(new Date().getTime() - 10 * 60 * 1000),
      caption: 'this post should be failed in job',
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        caption: 'this post should be failed in job',
        facebook_page: facebookPage,
      },
    })
}

function updateSocialPost(cb) {
  const socialPost = R().scheduleAnotherInstagramPost.data.id

  return F('reschedule social post for a next hour')
    .put(`/brands/${theBrand()}/social-post/${socialPost}`, {
      due_at: new Date(new Date().getTime() + 10 * 60 * 1000),
    })
    .after(cb)
    .expectStatus(200)
}

function scheduleInstagramPostForTestingDeleteMethod(cb) {
  const facebookPage = R().getInstagramProfiles.data[0].id
  const templateInstance = R().instantiateTemplate.data.id

  return F('schedule instagram post for testing delete method')
    .post(`/brands/${theBrand()}/social-post`, {
      facebookPage,
      templateInstance,
      due_at: new Date(new Date().getTime() - 10 * 60 * 1000),
      caption: 'test',
    })
    .after(cb)
    .expectStatus(200)
}

function deleteSocialPost(cb) {
  const socialPostId = R().scheduleInstagramPostForTestingDeleteMethod.data.id

  return F('social post should successfully be deleted')
    .delete(`/brands/${theBrand()}/social-post/${socialPostId}`)
    .after(cb)
    .expectStatus(204)
}

const publishSocialPost = (cb) => {
  return frisby
    .create('publish social post')
    .post('/jobs', {
      name: 'SocialPost.sendDue',
    })
    .addHeader('x-handle-jobs', 'yes')
    .after(cb)
    .expectStatus(200)
}

function getUserSocialPosts(cb) {
  const deletedSocialPostId = R().scheduleInstagramPostForTestingDeleteMethod.data.id
  const executedSocialPostId = R().scheduleInstagramPost.data.id

  return F('get executed social posts of brand')
    .get(`/brands/${theBrand()}/social-post?executed=true`)
    .after((err, res, body) => {
      const rowThatShouldBeDeleted = body.data.find(
        (socialPost) => socialPost.id === deletedSocialPostId
      )

      if (rowThatShouldBeDeleted) {
        throw new Error(`social post with id ${deletedSocialPostId} should be deleted`)
      }

      const rowThatShouldBeExecuted = body.data.find(
        (socialPost) => socialPost.id === executedSocialPostId
      )

      if (!rowThatShouldBeExecuted || !rowThatShouldBeExecuted.executed_at) {
        throw new Error(`social post with id ${executedSocialPostId} should be exist and executed`)
      }

      cb(err, res, body)
    })
    .expectStatus(200)
}

function getScheduledSocialPost(cb) {
  const scheduled = R().scheduleAnotherInstagramPost.data.id

  return F('get scheduled social posts of brand')
    .get(`/brands/${theBrand()}/social-post?executed=false`)
    .after((err, res, body) => {
      const scheduledPost = body.data.find((socialPost) => socialPost.id === scheduled)

      if (!scheduledPost) {
        throw new Error(`social post with id ${scheduled} should be exist and executed`)
      }
     
      cb(err, res, body)
    })
    .expectStatus(200)
}

function getEmptyList(cb) {
  return F('get empty list if you provide the wrong limit or start option')
    .get(`/brands/${theBrand()}/social-post?limit=1&start=10`)
    .after((err, res, body) => {
      if (body.data.length !== 0) {
        throw new Error('get empty list if you provide the wrong limit or start option')
      }

      cb(err, res, body)
    })
    .expectStatus(200)
}

function updateExecutedPost(cb) {
  const socialPost = R().scheduleInstagramPost.data.id

  return F('user can not update executed post')
    .put(`/brands/${theBrand()}/social-post/${socialPost}`, {
      due_at: new Date(new Date().getTime() + 10 * 60 * 1000),
    })
    .after(cb)
    .expectStatus(403)
}

function disconnect(cb) {
  const socialPost = R().getInstagramProfiles.data[0].id
  return F('disconnect instagram account')
    .delete(`/brands/${theBrand()}/users/self/facebook/${socialPost}`)
    .after(cb)
    .expectStatus(204)
}

function getUserSocialPostsAfterDisconnecting(cb) { 
  return F('social posts should be deleted after disconnecting the facebook page')
    .get(`/brands/${theBrand()}/social-post`)
    .after((err, res, body) => {
      const disconnectedPost = body.data.find((socialPost) => socialPost.facebook_page === R().getInstagramProfiles.data[0].id)
      const connectedPost = body.data.find((socialPost) => socialPost.facebook_page === R().getInstagramProfiles.data[1].id)

      if (disconnectedPost) {
        throw new Error('social posts should be deleted after disconnecting the facebook page')
      }

      if (!connectedPost) {
        throw new Error('social posts should not be deleted after disconnecting the facebook page')
      }

      cb(err, res, body)
    })
    .expectStatus(200)
}

module.exports = {
  brands: createBrands('create brands', brandSetup, (response) => response.data[0].id),
  ...switchBrand(theBrand, {
    requestFacebookAccess,
    authDone,    
    getInstagramProfiles,
    getTemplate,
    instantiateTemplate,
    scheduleInstagramPost,
    scheduleAnotherInstagramPost,
    scheduleAnotherInstagramPostForTestingFailedJob,
    updateSocialPost,
    scheduleInstagramPostForTestingDeleteMethod,
    deleteSocialPost,
    publishSocialPost,
    getUserSocialPosts,
    getScheduledSocialPost,
    getEmptyList,
    updateExecutedPost,
    disconnect,
    getUserSocialPostsAfterDisconnecting
  }),
}
