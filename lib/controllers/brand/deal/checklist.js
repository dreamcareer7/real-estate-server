const BrandChecklist = require('../../../models/Brand/deal/checklist')

const addChecklist = async (req, res) => {
  const checklist = req.body
  checklist.brand = req.params.id

  const saved = await BrandChecklist.create(checklist)

  res.model(saved)
}

const getChecklists = async (req, res) => {
  const checklists = await BrandChecklist.getByBrand(req.params.id)

  res.collection(checklists)
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


const router = function ({app, b, access, am}) {
  app.post('/brands/:id/checklists', b, access, am(addChecklist))
  app.get('/brands/:id/checklists', b, access, am(getChecklists))
  app.delete('/brands/:id/checklists/:cid', b, access, am(deleteChecklist))
  app.put('/brands/:id/checklists/:cid', b, access, am(updateChecklist))

}

module.exports = router
