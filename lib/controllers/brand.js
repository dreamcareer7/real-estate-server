const expect = require('../utils/validator').expect
const am = require('../utils/async_middleware')
const _u = require('lodash')
const promisify = require('../utils/promisify')

const get = async (req, res) => {
  const brand_id = req.params.id

  expect(brand_id).to.be.uuid

  const brand = await Brand.get(brand_id)
  res.model(brand)
}

const create = async (req, res) => {
  const brand = await Brand.create(req.body)
  res.model(brand)
}

const search = async (req, res) => {
  const hostname = req.query.hostname

  expect(hostname).to.be.a('string').and.to.have.length.above(4)

  const brand = await Brand.getByHostname(hostname)

  res.model(brand)
}

const addHostname = async (req, res) => {
  const hostname = req.body
  hostname.brand = req.params.id

  const brand = await Brand.addHostname(hostname)
  res.model(brand)
}

const removeHostname = async (req, res) => {
  const brand = await Brand.removeHostname(req.params.id, req.query.hostname)
  res.model(brand)
}

const addOffice = async (req, res) => {
  const office = req.body.office
  expect(office).to.be.a('string')

  const brand = await Brand.addOffice({
    brand: req.params.id,
    office: office
  })

  res.model(brand)
}

const addChecklist = async (req, res) => {
  const checklist = req.body
  checklist.brand = req.params.id

  const saved = await BrandChecklist.create(checklist)

  res.model(saved)
}

const getChecklists = async (req, res) => {
  const checklists = await BrandChecklist.getByBrand(req.params.id)

  res.model(checklists)
}

const deleteChecklist = async (req, res) => {
  await BrandChecklist.delete(req.params.cid)

  res.status(204)
  res.end()
}

const updateChecklist = async (req, res) => {
  const checklist = req.body
  checklist.id = req.params.cid

  const saved = await BrandChecklist.update(checklist)

  res.model(saved)
}

const addTask = async (req, res) => {
  const task = req.body
  task.checklist = req.params.id

  const checklist = await BrandChecklist.addTask(task)

  res.model(checklist)
}

const updateTask = async (req, res) => {
  const task = req.body
  task.id = req.params.tid

  await BrandChecklist.updateTask(task)

  res.end()
}

const deleteTask = async (req, res) => {
  await BrandChecklist.deleteTask(req.params.tid)

  res.status(204)
  res.end()
}

const addForm = async (req, res) => {
  const form = req.body.form

  const checklist = await BrandChecklist.addForm(req.params.id, form)

  res.model(checklist)
}

const deleteForm = async (req, res) => {
  await BrandChecklist.deleteForm(req.params.cid, req.params.fid)

  res.status(204)
  res.end()
}

const removeOffice = async (req, res) => {
  const brand = await Brand.removeOffice(req.params.id, req.params.office)
  res.model(brand)
}

const setBrand = async (req, res, next) => {
  let brand_id

  if (req.headers['x-rechat-brand'])
    brand_id = req.headers['x-rechat-brand']
  else if(req.user)
    brand_id = req.user.brand

  if(!brand_id)
    return next()

  expect(brand_id).to.be.uuid

  const brand = await Brand.get(brand_id)
  process.domain.brand = brand
  next()
}

const addRole = async (req, res) => {
  const role = req.body.role
  expect(role).to.be.a('string')

  const saved = await BrandRole.create({
    brand: req.params.id,
    role
  })

  res.model(saved)
}

const getRoles = async (req, res) => {
  const roles = await BrandRole.getByBrand(req.params.id)

  res.model(roles)
}

const deleteRole = async (req, res) => {
  await BrandRole.delete(req.params.role)

  res.status(204)
  return res.end()
}

const addMember = async (req, res) => {
  const users = req.body.users || []
  const emails = req.body.emails || []
  const phone_numbers = req.body.phone_numbers || []

  if (_u.isEmpty(users) && _u.isEmpty(emails) && _u.isEmpty(phone_numbers))
    return res.error(Error.Validation('You must supply either an array of user ids, emails or phone numbers'))

  if (!Array.isArray(users))
    return res.error(Error.Validation('`user` property must be an array of user ids'))

  if (!Array.isArray(emails))
    return res.error(Error.Validation('`emails` property must be an array of email addresses'))

  if (!Array.isArray(phone_numbers))
    return res.error(Error.Validation('`phone_numbers` property must be an array of phone numbers'))


  const saved = await promisify(User.getOrCreateBulk)(req.user.id, users, emails, phone_numbers)

  for(const user of saved) {
    await BrandRole.addMember({
      role: req.params.role,
      user
    })
  }

  const members = await BrandRole.getMembers(req.params.role)
  res.model(members)
}

const getMembers = async (req, res) => {
  const users = await BrandRole.getMembers(req.params.role)

  res.collection(users)
}

const deleteMember = async (req, res) => {
  await BrandRole.removeMember(req.params.role, req.params.use)
  res.status(204)
  return res.end()
}

const router = function (app) {
  const b = app.auth.bearer.middleware

  app.use(am(setBrand))
  app.post('/brands', b, am(create))

  app.post('/brands/:id/roles', b, am(addRole))
  app.get('/brands/:id/roles', b, am(getRoles))
  app.delete('/brands/:id/roles/:role', b, am(deleteRole))

  app.post('/brands/:id/roles/:role/members', b, am(addMember))
  app.get('/brands/:id/roles/:role/members', b, am(getMembers))
  app.delete('/brands/:id/roles/:role/members/:user', b, am(deleteMember))

  app.post('/brands/:id/hostnames', b, am(addHostname))
  app.delete('/brands/:id/hostnames', b, am(removeHostname))

  app.post('/brands/:id/checklists', b, am(addChecklist))
  app.get('/brands/:id/checklists', b, am(getChecklists))
  app.delete('/brands/:id/checklists/:cid', b, am(deleteChecklist))
  app.put('/brands/:id/checklists/:cid', b, am(updateChecklist))

  app.post('/brands/:id/checklists/:id/tasks', b, am(addTask))
  app.delete('/brands/:id/checklists/:cid/tasks/:tid', b, am(deleteTask))
  app.put('/brands/:id/checklists/:cid/tasks/:tid', b, am(updateTask))

  app.post('/brands/:id/checklists/:id/forms', b, am(addForm))
  app.delete('/brands/:id/checklists/:cid/forms/:fid', b, am(deleteForm))

  app.post('/brands/:id/offices', b, am(addOffice))
  app.delete('/brands/:id/offices/:office', b, am(removeOffice))

  app.get('/brands/search', am(search))
  app.get('/brands/:id', am(get))
}

module.exports = router
