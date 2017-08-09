const db = require('../../utils/db')

DealChecklist = {}

Orm.register('deal_checklist', 'DealChecklist')

DealChecklist.get = async id => {
  const checklists = await DealChecklist.getAll([id])
  if (checklists.length < 1)
    throw Error.ResourceNotFound(`Checklist ${id} not found`)

  return checklists[0]
}

DealChecklist.getAll = async ids => {
  const res = await db.query.promise('deal/checklist/get', [ids])
  return res.rows
}

DealChecklist.create = async checklist => {
  const res = await db.query.promise('deal/checklist/insert', [
    checklist.title,
    checklist.order,
    checklist.deal
  ])

  return DealChecklist.get(res.rows[0].id)
}

DealChecklist.addChecklist = async (deal, brand_checklist_id) => {
  const checklist = await BrandChecklist.get(brand_checklist_id)

    checklist.deal = deal_id
    const saved = await DealChecklist.create(checklist)

    if (!checklist.tasks)
      continue

    for(const task of checklist.tasks) {
      task.checklist = saved.id
      await Task.create(task)
    }
  }
}

DealChecklist.associations = {
  tasks: {
    collection: true,
    model: 'Task'
  }
}