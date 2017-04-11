const config = require('../../lib/config.js')
const user = require('./data/user.js')
const address = require('./data/address.js')
const user_response = require('./expected_objects/user.js')
const info_response = require('./expected_objects/info.js')
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

const searchByEmail = (cb) => {
  return frisby.create('search users by email')
    .get('/users/search?q[]=' + results.user.create.data.email)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [
        {
          type: 'user'
        }
      ]
    })
    .expectJSONTypes({
      code: String,
      data: [user_response],
      info: info_response
    })
}

const searchByPhone = (cb) => {
  return frisby.create('search users by phone')
    .get('/users/search?q[]=' + encodeURIComponent(results.user.create.data.phone_number))
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [
        {
          type: 'user'
        }
      ]
    })
    .expectJSONTypes({
      code: String,
      data: [user_response],
      info: info_response
    })
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
  searchByEmail,
  searchByPhone,
  deleteAddress,
  deleteUser
}
