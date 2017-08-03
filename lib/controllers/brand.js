const expect = require('../utils/validator').expect
const am = require('../utils/async_middleware')

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

const addTask = async (req, res) => {
  const task = req.body
  task.checklist = req.params.id

  const checklist = await BrandChecklist.addTask(task)

  res.model(checklist)
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

const router = function (app) {
  const b = app.auth.bearer.middleware

  app.use(am(setBrand))
  app.post('/brands', b, am(create))
  app.post('/brands/:id/hostnames', b, am(addHostname))
  app.delete('/brands/:id/hostnames', b, am(removeHostname))
  app.post('/brands/:id/checklists', b, am(addChecklist))
  app.post('/brands/checklists/:id/tasks', b, am(addTask))
  app.post('/brands/:id/offices', b, am(addOffice))
  app.delete('/brands/:id/offices/:office', b, am(removeOffice))
  app.get('/brands/search', b, am(search))
  app.get('/brands/:id', b, am(get))
}

module.exports = router
