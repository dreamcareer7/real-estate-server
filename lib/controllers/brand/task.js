const { expect } = require('../../utils/validator')

const BrandChecklist = require('../../models/Brand/deal/checklist')
const Orm = require('../../models/Orm')

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

const sortTasks = async (req, res) => {
  const checklist = await BrandChecklist.get(req.params.cid)

  const pairs = req.body
  await BrandChecklist.sort(pairs)

  // Validation.
  const tasks = checklist.tasks?.map(t => t.id)

  for(const pair of pairs)
    expect(tasks).to.include(pair.id)

  res.status(200)
  res.end()
}

const router = function ({app, b, access, am}) {
  app.post('/brands/:id/checklists/:cid/tasks', b, access, am(addTask))
  app.delete('/brands/:id/checklists/:cid/tasks/:tid', b, access, am(deleteTask))
  app.put('/brands/:id/checklists/:cid/tasks/:tid', b, access, am(updateTask))
  app.put('/brands/:id/checklists/:cid/sort', b, access, am(sortTasks))
}

module.exports = router
