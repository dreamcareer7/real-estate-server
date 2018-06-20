const db = require('../../utils/db')
const promisify = require('../../utils/promisify')

const Orm = require('../Orm')

const DealChecklist = {}
global['DealChecklist'] = DealChecklist

Orm.register('deal_checklist', 'DealChecklist', DealChecklist)

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
    checklist.deal,
    checklist.origin,
    checklist.is_deactivated,
    checklist.is_terminated
  ])

  return DealChecklist.get(res.rows[0].id)
}

DealChecklist.update = async checklist => {
  await db.query.promise('deal/checklist/update', [
    checklist.id,
    checklist.title,
    checklist.order,
    checklist.is_deactivated,
    checklist.is_terminated
  ])

  return DealChecklist.get(checklist.id)
}

DealChecklist.addChecklists = async deal => {
  let parent = deal.brand

  while(parent) {
    const brand = await Brand.get(parent)
    parent = brand.parent

    const checklists = (await BrandChecklist.getByBrand(brand.id))

    for (const checklist of checklists) {
      if (checklist.deal_type && checklist.deal_type !== deal.deal_type)
        continue

      if (checklist.property_type && checklist.property_type !== deal.property_type)
        continue

      checklist.deal = deal.id
      checklist.origin = checklist.id

      const saved = await DealChecklist.create(checklist)

      if (!checklist.tasks)
        continue

      for(const task of checklist.tasks) {
        task.checklist = saved.id
        await Task.create(task)
      }
    }
  }
}

DealChecklist.offer = async (checklist, conditions) => {
  const deal = await promisify(Deal.get)(checklist.deal)

  let parent = deal.brand

  while(parent) {
    const brand = await Brand.get(parent)
    parent = brand.parent

    const checklists = (await BrandChecklist.getByBrand(brand.id))

    for (const candidate of checklists) {

      if (candidate.deal_type && candidate.deal_type !== conditions.deal_type)
        continue

      if (candidate.property_type && candidate.property_type !== conditions.property_type)
        continue

      checklist.origin = candidate.id

      const saved = await DealChecklist.create(checklist)

      if (!candidate.tasks)
        return DealChecklist.get(saved.id)

      for(const task of candidate.tasks) {
        task.checklist = saved.id
        await Task.create(task)
      }

      return DealChecklist.get(saved.id)
    }
  }
}

DealChecklist.associations = {
  tasks: {
    collection: true,
    model: 'Task'
  },

  allowed_forms: {
    collection: true,
    model: 'Form'
  }
}

module.exports = DealChecklist
