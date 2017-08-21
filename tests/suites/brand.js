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
      property_type: 'Resale',
      order: 2
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
//       data: brand
    })
}

const deleteChecklist = cb => {
  return frisby.create('delete a checklist to a brand')
    .delete(`/brands/${results.brand.create.data.id}/checklists/${results.brand.addChecklist.data.id}`)
    .after(cb)
    .expectStatus(204)
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
    .post(`/brands/${results.brand.create.data.id}/checklists/${results.brand.addChecklist.data.id}/tasks`, {
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

const addForm = cb => {
  return frisby.create('add an allowed form to a brand checklist')
    .post(`/brands/${results.brand.create.data.id}/checklists/${results.brand.addChecklist.data.id}/forms`, {
      form: results.form.create.data.id,
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
//       data: brand
    })
}

const deleteTask = cb => {
  return frisby.create('delete a task from a brand checklist')
    .delete(`/brands/${results.brand.create.data.id}/checklists/${results.brand.addChecklist.data.id}/tasks/${results.brand.addTask.data.id}`)
    .after(cb)
    .expectStatus(204)
}

const deleteForm = cb => {
  return frisby.create('delete a form from a brand checklist')
    .delete(`/brands/${results.brand.create.data.id}/checklists/${results.brand.addChecklist.data.id}/forms/${results.form.create.data.id}`)
    .after(cb)
    .expectStatus(204)
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

const addRole = cb => {
  return frisby.create('add a role to a brand')
    .post(`/brands/${results.brand.create.data.id}/roles`, {
      role: 'Admin'
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
    })
}

const getRoles = cb => {
  return frisby.create('get all roles for a brand')
    .get(`/brands/${results.brand.create.data.id}/roles`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
}

const deleteRole = cb => {
  return frisby.create('delete a brand role')
    .delete(`/brands/${results.brand.create.data.id}/roles/${results.brand.addRole.data.id}`)
    .after(cb)
    .expectStatus(204)
}

const addMember = cb => {
  return frisby.create('add a user to a brand role')
    .post(`/brands/${results.brand.create.data.id}/roles/${results.brand.addRole.data.id}/members`, {
      emails: ['invited-member@boer.rechat.com']
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
    })
}

const getMembers = cb => {
  return frisby.create('get all members of a brand role')
    .get(`/brands/${results.brand.create.data.id}/roles/${results.brand.addRole.data.id}/members`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
    })
}

const deleteMember = cb => {
  return frisby.create('delete a member from a role')
    .delete(`/brands/${results.brand.create.data.id}/roles/${results.brand.addRole.data.id}/members/${results.authorize.token.data.id}`)
    .after(cb)
    .expectStatus(204)
}


module.exports = {
  createParent,
  create,

  addRole,
  getRoles,

  addMember,
  getMembers,
  deleteMember,

  deleteRole,

  addOffice,
  addHostname,
  addChecklist,
  addForm,
  addTask,
  getChecklists,
  deleteTask,
  deleteForm,
  deleteChecklist,
  getByHostname,
  removeOffice,
  removeHostname
}
