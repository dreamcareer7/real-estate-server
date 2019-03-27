registerSuite('contact', [
  'brandCreateParent',
  'brandCreate',
  'getAttributeDefs',
  'createBrandLists'
])

function createDefaultLists(cb) {
  return frisby.create('create default lists for user')
    .post('/jobs', {
      name: 'contact_lists',
      data: {
        type: 'create_default_lists',
        brand_id: results.contact.brandCreate.data.id
      }
    })
    .after(cb)
    .expectStatus(200)
}

function checkDefaultLists(cb) {
  return frisby
    .create('check if default lists are created in the right order')
    .get('/contacts/lists')
    .after(cb)
    .expectStatus(200)
    .expectJSONLength('data', 4)
    .expectJSON({
      code: 'OK',
      data: [
        {
          name: 'Warm List'
        },
        {
          name: 'Hot List'
        },
        {
          name: 'Past Client'
        },
        {
          name: 'iOS'
        }
      ]
    })
}

function create(cb) {
  const tag = results.contact.getAttributeDefs.data.find(a => a.name === 'tag')

  return frisby
    .create('create contact search list')
    .post('/contacts/lists', {
      filters: [
        {
          attribute_def: tag.id,
          value: 'cool'
        },
        {
          attribute_def: tag.id,
          value: 'great'
        }
      ],
      args: {
        q: 'Wow'
      },
      name: 'Wow list'
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        name: 'Wow list'
      }
    })
}

function createWithEmptyFilters(cb) {
  const data = {
    name: 'Empty List',
    filters: [],
    args: {
      q: null,
      filter_type: 'and'
    }
  }

  return frisby
    .create('create a contact list with emptpy filters')
    .post('/contacts/lists', data)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        name: 'Empty List'
      }
    })
}

function update(cb) {
  const update = {
    ...results.contact_list.create.data,
    args: {
      q: 'OMG',
      filter_type: 'and'
    }
  }

  delete update.query

  delete update.updated_at
  delete update.updated_by

  return frisby
    .create('update contact search list')
    .put('/contacts/lists/' + results.contact_list.create.data.id, update)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: update
    })
}

function listForUser(cb) {
  return frisby
    .create('list for user')
    .get('/contacts/lists')
    .after((err, res, json) => {
      if (!json.data.map(x => x.name).includes('Wow list'))
        throw 'Wow list not found!'
      cb(err, res, json)
    })
    .expectStatus(200)
}

function deleteIt(cb) {
  return frisby
    .create('delete contact search list')
    .delete(`/contacts/lists/${results.contact_list.create.data.id}`)
    .after(cb)
    .expectStatus(204)
}

function listAllFilters(cb) {
  return frisby
    .create('list all availabe filters')
    .get('/contacts/lists/options')
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
  createDefaultLists,
  checkDefaultLists,
  create,
  createWithEmptyFilters,
  update,
  listForUser,
  deleteIt,
  listAllFilters
}
