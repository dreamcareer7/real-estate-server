const config = require('../../lib/config.js')
const user = require('./data/user.js')
const address = require('./data/address.js')
const user_response = require('./expected_objects/user.js')
const uuid = require('node-uuid')

const password = config.tests.password

const client = JSON.parse(JSON.stringify(user))

client.client_id = config.tests.client_id
client.client_secret = config.tests.client_secret

const create = (cb) => {
  return frisby.create('create user')
    .post('/users', client)
    .after(cb)
    .expectStatus(201)
    .expectJSONTypes({
      code: String,
      data: user_response
    })
}

const create401 = (cb) => {
  return frisby.create('expect 401 with empty model')
    .post('/users')
    .after(cb)
    .expectStatus(401)
}

const getUser = (cb) => {
  return frisby.create('get user')
    .get('/users/' + results.user.create.data.id)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: results.user.create.data
    })
    .expectJSONTypes({
      code: String,
      data: user_response
    })
}

const getUser404 = (cb) => {
  return frisby.create('expect 404 with invalid user id when getting a user')
    .get('/users/' + uuid.v1())
    .after(cb)
    .expectStatus(404)
}

const update = (cb) => {
  const updatedUser = JSON.parse(JSON.stringify(results.authorize.token.data))
  updatedUser.first_name = 'updated first name'
  updatedUser.password = password

  return frisby.create('update user')
    .put('/users/self', updatedUser)
    .after(cb)
    .expectStatus(200)
    .expectJSONTypes({
      code: String,
      data: user_response
    })
}

const changePassword = (cb) => {
  return frisby.create('change password of a user')
    .patch('/users/self/password', {
      old_password: password,
      new_password: 'aaaaaa'
    })
    .after(cb)
    .expectStatus(200)
}

const changePassword401 = (cb) => {
  return frisby.create('expect 400 with empty model when changing password of a user')
    .patch('/users/self/password')
    .after(cb)
    .expectStatus(400)
}

const resetPassword = (cb) => {
  return frisby.create('initiate password reset')
    .post('/users/reset_password', {email: user.email})
    .after(cb)
    .expectStatus(204)
}

const resetPassword404 = (cb) => {
  return frisby.create('expect 404 with invalid email when initiating password reset')
    .post('/users/reset_password', {email: 'invalid email'})
    .after(cb)
    .expectStatus(404)
}

const setAddress = (cb) => {
  return frisby.create('set address')
    .put('/users/self/address', address)
    .after(cb)
    .expectStatus(200)
    .expectJSONTypes({
      code: String,
      data: user_response
    })
}

const setAddress400 = (cb) => {
  return frisby.create('set address')
    .put('/users/self/address')
    .after(cb)
    .expectStatus(400)
}

const patchUserTimeZone = (cb) => {
  return frisby.create('change timezone setting for a user')
    .patch('/users/self/timezone', {time_zone: results.user.create.data.timezone})
    .after(cb)
    .expectStatus(204)
}

const addInvalidActivityByAction = (cb) => {
  return frisby.create('record an activity by invalid action')
    .post('/users/self/timeline', {
      action: 'BombasticActivity',
      object_class: 'phone_call',
      object: {
        type: 'phone_call',
        duration: 180
      }
    })
    .after(cb)
    .expectStatus(400)
}

const addInvalidActivityByType = (cb) => {
  return frisby.create('record an activity by invalid type')
    .post('/users/self/timeline', {
      action: 'UserCalledContact',
      object_class: 'bombastic_call',
      object: {
        type: 'bombastic_call',
      }
    })
    .after(cb)
    .expectStatus(400)
}

const addInvalidActivityActionMissing = (cb) => {
  return frisby.create('record an activity when action is missing')
    .post('/users/self/timeline', {
      object_class: 'UserCalledContact',
      object: {
        type: 'phone_call',
      }
    })
    .after(cb)
    .expectStatus(400)
}

const addInvalidActivityObjectClassMissing = (cb) => {
  return frisby.create('record an activity when object class is missing')
    .post('/users/self/timeline', {
      action: 'UserCalledContact',
      object: {
        type: 'phone_call',
      }
    })
    .after(cb)
    .expectStatus(400)
}

const addInvalidActivityObjectMissing = (cb) => {
  return frisby.create('record an activity when object is missing')
    .post('/users/self/timeline', {
      action: 'UserCalledContact',
      object_class: 'phone_call',
    })
    .after(cb)
    .expectStatus(400)
}

const addActivity = (cb) => {
  return frisby.create('record activity for user')
    .post('/users/self/timeline', {
      action: 'UserOpenedIOSApp',
      object_class: 'ios_app',
      object: {
        type: 'ios_app',
        version: '0.0.0'
      }
    })
    .after(cb)
    .expectStatus(200)
}

const getTimeline = (cb) => {
  return frisby.create('get list of user activities (timeline)')
    .get(`/users/${results.user.create.data.id}/timeline`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [
        {
        }
      ],
      info: {
      }
    })
}

const initiatePasswordReset = (cb) => {
  return frisby.create('initiate password reset')
  .post('/users/reset_password', {
    email: 'test@rechat.com'
  })
  .after(cb)
  .expectStatus(204)
}

const resetPasswordByTokenEmail = (cb) => {
  return frisby.create('reset password by token and email')
  .patch('/users/password', {
    email: 'test@rechat.com',
    token: 'a',
    password: '123456'
  })
  .after(cb)
  .expectStatus(204)
}

const resetPasswordByShadowTokenEmail = (cb) => {
  return frisby.create('reset password by shadow token and email')
  .patch('/users/password', {
    email: 'test@rechat.com',
    shadow_token: '206cc0a36c8ecfa37639a4d0dc682c73',
    password: '123456'
  })
  .after(cb)
  .expectStatus(204)
}

const resetPasswordByShadowTokenPhone = (cb) => {
  return frisby.create('reset password by shadow token and phone number')
  .patch('/users/password', {
    phone_number: '+4368120265807',
    shadow_token: '206cc0a36c8ecfa37639a4d0dc682c73',
    password: '123456'
  })
  .after(cb)
  .expectStatus(204)
}

const deleteAddress = (cb) => {
  return frisby.create('delete address')
    .delete('/users/self/address')
    .after(cb)
    .expectStatus(200)
    .expectJSONTypes({
      code: String,
      data: user_response
    })
}

const deleteUser = (cb) => {
  return frisby.create('delete user')
    .delete('/users/self')
    .after(cb)
    .expectStatus(204)
}

module.exports = {
  create,
  create401,
  getUser,
  getUser404,
  update,
  changePassword,
  changePassword401,
  resetPassword,
  resetPassword404,
  setAddress,
  setAddress400,
  patchUserTimeZone,
  addInvalidActivityByAction,
  addInvalidActivityByType,
  addInvalidActivityActionMissing,
  addInvalidActivityObjectClassMissing,
  addInvalidActivityObjectMissing,
  addActivity,
  getTimeline,
  initiatePasswordReset,
  resetPasswordByTokenEmail,
  resetPasswordByShadowTokenEmail,
  resetPasswordByShadowTokenPhone,
  deleteAddress,
  deleteUser
}
