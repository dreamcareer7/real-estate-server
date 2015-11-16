//register dependencies
registerSuite('user', ['create'])

var create = (cb) => {
  return frisby.create('create verification')
    .post('/verifications')
    .after(cb)
    .expectStatus(201)
    .expectJSON({
      code: 'OK',
      data: [
        {
          type: 'invitation'
        }
      ]
    })
    .expectJSONLength('data', 1);
}

var verify = (cb) => {
  return frisby.create('verify code')
    .get('/verifications/' + results.verification.create.data.code + '?user_id=' + results.verification.create.data.user_id)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [
        {
          status: 'verified'
        }
      ]
    })
    .expectJSONLength('data', 1);
}

module.exports = {
  create,
  verify
}
