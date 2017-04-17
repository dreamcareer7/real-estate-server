const form = require('./data/form.js')
const form_response = require('./expected_objects/form.js')

const create = cb => {
  return frisby.create('create a form')
    .post('/forms', form)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: form
    })
    .expectJSONTypes({
      code: String,
      data: form_response
    })
}

const update = cb => {
  const form = results.form.create.data
  form.name = 'Updated form name'

  // update_at is going to change. If we dont delete this this,
  // it will try to match updated_at with the previous updated_at
  // and it will fail because we now have updated the value
  // so we expect the updated_at to change
  delete form.updated_at

  return frisby.create('update a form')
    .put(`/forms/${form.id}`, form)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: form
    })
    .expectJSONTypes({
      code: String,
      data: form_response
    })
}

const get = cb => {
  return frisby.create('get a form')
    .get(`/forms/${results.form.update.data.id}`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: results.form.update.data
    })
    .expectJSONTypes({
      code: String,
      data: form_response
    })
}

const getAll = (cb) => {
  return frisby.create('get all forms')
    .get('/forms')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: []
    })
    .expectJSONTypes({
      code: String,
      data: [form_response]
    })
}

const getByFSId = (cb) => {
  return frisby.create('get form by formstack id')
    .get(`/forms/search?formstack_id=${results.form.update.data.formstack_id}`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: results.form.update.data
    })
    .expectJSONTypes({
      code: String,
      data: form_response
    })
}

module.exports = {
  create,
  update,
  get,
  getAll,
  getByFSId,
}
