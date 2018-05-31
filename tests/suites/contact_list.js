function create (cb) {
  return frisby.create('create contact search list')
    .post('/contact/list', {
      filters: [
        {
          'attribute_def': '24171fd0-7994-43fc-a1cb-adcb726429b5',
          'values': ['cool', 'great'],
          'operator': 'all'
        }
      ],
      'name': 'Wow list',
      'isPinned': true
    })
    .after((err, response, body) => {
      cb(err, response, body)
    })
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
    .expectJSONTypes({
      code: String,
      data: String
    })
}

function update(cb) {
  return frisby.create('update contact search list')
    .put('/contact/list/' + results.contact_list.create.data, {
      filters: [
        {
          'attribute_def': '24171fd0-7994-43fc-a1cb-adcb726429b5',
          'values': ['cool', 'great'],
          'operator': 'all'
        }
      ],
      'name': 'Wow list',
      'isPinned': false
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
    .expectJSONTypes({
      code: String,
      data: Array
    })
}

function listForUser(cb) {
  return frisby.create('list for user')
    .get('/contact/list')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
    .expectJSONTypes({
      data: Array
    })
}

function deleteIt(cb) {
  return frisby.create('delete contact search list')
    .delete(`/contact/list/${results.contact_list.create.data}`)
    .after(cb)
    .expectStatus(204)
}

function listAllFilters(cb) {
  return frisby.create('list all availabe filters')
    .get('/contact/list/options')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
    .expectJSONTypes({
      data: Object
    })
}

module.exports = {
  create,
  update,
  listForUser,
  deleteIt,
  listAllFilters
}