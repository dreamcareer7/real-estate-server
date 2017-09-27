const brand = require('./data/brand.js')

registerSuite('office', ['add'])
registerSuite('form', ['create'])

const hostname = 'testhost'
let office_id
let brand_id

const createParent = (cb) => {
  brand.name = 'Parent Brand'
  brand.role = 'Admin' // We're admin of this one

  return frisby.create('create a brand')
    .post('/brands', brand)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
//       data: brand
    })
}

const create = (cb) => {
  brand.parent = results.brand.createParent.data.id
  brand.name = 'Brand'
  delete brand.role // We don't have a role in this one. But we should have access as we have access to the parent.

  return frisby.create('create a child brand')
    .post('/brands', brand)
    .after((err, res, body) => {
      brand_id = body.data.id
      cb(err, res, body)
    })
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
    })
}

const get = (cb) => {
  return frisby.create('get brand')
    .get(`/brands/${results.brand.create.data.id}`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: results.brand.create.data
    })
}

const byParent = (cb) => {
  return frisby.create('get brands by their parent')
    .get(`/brands/${results.brand.createParent.data.id}/children`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: [results.brand.create.data]
    })
}

const update = cb => {
  const updated = {...results.brand.create.data, name: 'Updated Brand'}

  return frisby.create('update brand')
    .put(`/brands/${results.brand.create.data.id}`, updated)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: updated
    })
}

const addHostname = cb => {
  return frisby.create('add hostname to a brand')
    .post(`/brands/${brand_id}/hostnames`, {
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
    .delete(`/brands/${brand_id}/hostnames?hostname=${hostname}`)
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
    .post(`/brands/${brand_id}/offices`, {
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
    .post(`/brands/${brand_id}/checklists`, {
      title: 'Checklist 1',
      deal_type: 'Buying',
      property_type: 'Resale',
      order: 2,
      is_terminatable: true,
      is_deactivatable: true,
      tab_name: 'Contract'
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
//       data: brand
    })
}

const updateChecklist = cb => {
  const data = results.brand.addChecklist.data
  data.title = 'Updated Checklist'

  return frisby.create('update a checklist')
    .put(`/brands/${brand_id}/checklists/${results.brand.addChecklist.data.id}`, data)
    .after(cb)
    .expectStatus(200)
}

const deleteChecklist = cb => {
  return frisby.create('delete a checklist to a brand')
    .delete(`/brands/${brand_id}/checklists/${results.brand.addChecklist.data.id}`)
    .after(cb)
    .expectStatus(204)
}

const getChecklists = cb => {
  return frisby.create('get a brands checklists')
    .get(`/brands/${brand_id}/checklists`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
//       data: brand
    })
}

const addTask = cb => {
  return frisby.create('add a task to a brand checklist')
    .post(`/brands/${brand_id}/checklists/${results.brand.addChecklist.data.id}/tasks`, {
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

const updateTask = cb => {
  const d = results.brand.addTask.data
  d.title = 'Updated Task'

  return frisby.create('update a task')
    .put(`/brands/${brand_id}/checklists/${results.brand.addChecklist.data.id}/tasks/${results.brand.addTask.data.id}`, d)
    .after(cb)
    .expectStatus(200)
}

const addForm = cb => {
  return frisby.create('add an allowed form to a brand checklist')
    .post(`/brands/${brand_id}/checklists/${results.brand.addChecklist.data.id}/forms`, {
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
    .delete(`/brands/${brand_id}/checklists/${results.brand.addChecklist.data.id}/tasks/${results.brand.addTask.data.id}`)
    .after(cb)
    .expectStatus(204)
}

const deleteForm = cb => {
  return frisby.create('delete a form from a brand checklist')
    .delete(`/brands/${brand_id}/checklists/${results.brand.addChecklist.data.id}/forms/${results.form.create.data.id}`)
    .after(cb)
    .expectStatus(204)
}

const removeOffice = cb => {
  return frisby.create('remove an office from a brand')
    .delete(`/brands/${brand_id}/offices/${office_id}`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
//       data: brand
    })
}

const addRole = cb => {
  return frisby.create('add a role to a brand')
    .post(`/brands/${brand_id}/roles`, {
      role: 'Admin',
      acl: [
        'deals/*'
      ]
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
    })
}

const updateRole = cb => {
  return frisby.create('update a role')
    .post(`/brands/${brand_id}/roles`, {
      role: 'Updated Role Name',
      acl: [
        'deals/*',
        'admin'
      ]
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
    })
}

const getRoles = cb => {
  return frisby.create('get all roles for a brand')
    .get(`/brands/${brand_id}/roles`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
}

const deleteRole = cb => {
  return frisby.create('delete a brand role')
    .delete(`/brands/${brand_id}/roles/${results.brand.addRole.data.id}`)
    .after(cb)
    .expectStatus(204)
}

const addMember = cb => {
  return frisby.create('add a user to a brand role')
    .post(`/brands/${brand_id}/roles/${results.brand.addRole.data.id}/members`, {
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
    .get(`/brands/${brand_id}/roles/${results.brand.addRole.data.id}/members`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
    })
}

const deleteMember = cb => {
  return frisby.create('delete a member from a role')
    .delete(`/brands/${brand_id}/roles/${results.brand.addRole.data.id}/members/${results.authorize.token.data.id}`)
    .after(cb)
    .expectStatus(204)
}

const removeBrand = cb => {
  return frisby.create('delete a brand')
    .delete(`/brands/${brand_id}`)
    .after(cb)
    .expectStatus(204)
}

module.exports = {
  createParent,
  create,

  get,
  byParent,
  update,

  addRole,
  updateRole,
  getRoles,

  addMember,
  getMembers,
  deleteMember,

  deleteRole,

  addOffice,
  addHostname,
  addChecklist,
  updateChecklist,
  addForm,
  addTask,
  updateTask,
  getChecklists,
  deleteTask,
  deleteForm,
  deleteChecklist,
  getByHostname,
  removeOffice,
  removeHostname,

  removeBrand
}
