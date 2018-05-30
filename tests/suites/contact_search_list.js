function create (cb) {
  return frisby.create('create contact search list')
    .post('/contact-search-lists', {
      filters: [
        {
          'collection': 'contacts',
          'property': 'tag',
          'type': 'enum',
          'values': ['cool', 'great'],
          'operator': 'matchAll'
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
    .put('/contact-search-lists/' + results.contact_search_list.create.data, {
      filters: [
        {
          'collection': 'contacts',
          'property': 'tag',
          'type': 'enum',
          'values': ['cool', 'great'],
          'operator': 'matchAll'
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
    .get('/contact-search-lists')
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
    .delete(`/contact-search-lists/${results.contact_search_list.create.data}`)
    .after(cb)
    .expectStatus(200)
}

function listAllFilters(cb) {
  return frisby.create('list all availabe filters')
    .get('/contact-search-lists/options')
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