const brand = require('./data/brand.js')

registerSuite('office', ['add'])
registerSuite('form', ['create'])

const hostname = 'testhost'
let office_id

const createParent = (cb) => {
  return frisby.create('create a brand')
    .post('/brands', brand)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: brand
    })
}

const create = (cb) => {
  brand.parent = results.brand.createParent.data.id

  return frisby.create('create a child brand')
    .post('/brands', brand)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
//       data: brand
    })
}

const addHostname = cb => {
  return frisby.create('add hostname to a brand')
    .post(`/brands/${results.brand.create.data.id}/hostnames`, {
      hostname: hostname,
      is_default: true
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
//       data: brand
    })
}

const removeHostname = cb => {
  return frisby.create('delete hostname of a brand')
    .delete(`/brands/${results.brand.create.data.id}/hostnames?hostname=${hostname}`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
//       data: brand
    })
}


const addOffice = cb => {
  office_id = results.office.add.rows[0].id
  return frisby.create('add an office to a brand')
    .post(`/brands/${results.brand.create.data.id}/offices`, {
      office: office_id
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
//       data: brand
    })
}

const addChecklist = cb => {
  return frisby.create('add a checklist to a brand')
    .post(`/brands/${results.brand.create.data.id}/checklists`, {
      title: 'Checklist 1',
      deal_type: 'Buying',
      contract_type: 'Resale',
      order: 2
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
//       data: brand
    })
}

const getChecklists = cb => {
  return frisby.create('get a brands checklists')
    .get(`/brands/${results.brand.create.data.id}/checklists`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
//       data: brand
    })
}

const addTask = cb => {
  return frisby.create('add a task to a brand checklist')
    .post(`/brands/checklists/${results.brand.addChecklist.data.id}/tasks`, {
      title: 'Task 1',
      task_type: 'Form',
      form: results.form.create.data.id,
      order: 1
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
//       data: brand
    })
}

const removeOffice = cb => {
  return frisby.create('remove an office from a brand')
    .delete(`/brands/${results.brand.create.data.id}/offices/${office_id}`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
//       data: brand
    })
}

const getByHostname = (cb) => {
  return frisby.create('search for a hostname')
    .get(`/brands/search?hostname=${hostname}`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
//       data: brand
    })
}


module.exports = {
  createParent,
  create,
  addOffice,
  addHostname,
  addChecklist,
  addTask,
  getChecklists,
  getByHostname,
  removeOffice,
  removeHostname
}
