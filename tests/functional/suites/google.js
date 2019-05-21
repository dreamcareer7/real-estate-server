// const xxxxx = require('./expected_objects/xxxxx.js')

registerSuite('agent', ['add'])
registerSuite('brand', ['createParent', 'create'])
registerSuite('contact', ['brandCreateParent', 'brandCreate'])



function requestGmailAccess(cb) {
  // const body = {
  //   username: 'username',
  //   password: 'password'
  // }

  // return frisby.create('create a showings credential')
  //   .post('/users/self/showings/credentials', body)
  //   .after(cb)
  //   .expectStatus(200)
  //   .expectJSON({
  //     code: 'OK',
  //     data: showings_credential
  //   })
}

function grantAccess(cb) {
}

function revokeAccess(cb) {
}


module.exports = {
  requestGmailAccess,
  grantAccess,
  revokeAccess
}