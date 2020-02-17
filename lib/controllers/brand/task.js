const BrandChecklist = require('../../models/Brand/deal/checklist')

const addTask = async (req, res) => {
  const task = req.body
  task.checklist = req.params.cid

  const checklist = await BrandChecklist.addTask(task)

  res.model(checklist)
}

const updateTask = async (req, res) => {
  const task = req.body
  task.id = req.params.tid

  await BrandChecklist.updateTask(task)

  const checklist = await BrandChecklist.get(req.params.cid)
  res.model(checklist)
}

const deleteTask = async (req, res) => {
  await BrandChecklist.deleteTask(req.params.tid)

  res.status(204)
  res.end()
}

const router = function ({app, b, access, am}) {
  app.post('/brands/:id/checklists/:cid/tasks', b, access, am(addTask))
  app.delete('/brands/:id/checklists/:cid/tasks/:tid', b, access, am(deleteTask))
  app.put('/brands/:id/checklists/:cid/tasks/:tid', b, access, am(updateTask))
}

module.exports = router
