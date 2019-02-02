const db = require('../../utils/db')
const Orm = require('../Orm')

const BrandChecklist = {}
global['BrandChecklist'] = BrandChecklist

BrandChecklist.get = async id => {
  const checklists = await BrandChecklist.getAll([id])
  if (checklists.length < 1)
    throw Error.ResourceNotFound(`Brand Checklist ${id} not found`)

  return checklists[0]
}

BrandChecklist.getAll = async ids => {
  const res = await db.query.promise('brand/checklist/get', [ids])
  return res.rows
}

BrandChecklist.create = async checklist => {
  const res = await db.query.promise('brand/checklist/insert', [
    checklist.brand,
    checklist.title,
    checklist.deal_type,
    checklist.property_type,
    checklist.order,
    checklist.is_deactivatable,
    checklist.is_terminatable,
    checklist.tab_name
  ])

  return BrandChecklist.get(res.rows[0].id)
}

BrandChecklist.update = async checklist => {
  await db.query.promise('brand/checklist/update', [
    checklist.id,
    checklist.title,
    checklist.deal_type,
    checklist.property_type,
    checklist.order,
    checklist.is_deactivatable,
    checklist.is_terminatable,
    checklist.tab_name
  ])

  return BrandChecklist.get(checklist.id)
}

BrandChecklist.delete = async checklist_id => {
  await db.query.promise('brand/checklist/remove', [
    checklist_id
  ])
}

BrandChecklist.addTask = async task => {
  await db.query.promise('brand/checklist/task/insert', [
    task.title,
    task.task_type,
    task.form,
    task.order,
    task.checklist
  ])

  return BrandChecklist.get(task.checklist)
}

BrandChecklist.updateTask = async task => {
  await db.query.promise('brand/checklist/task/update', [
    task.id,
    task.title,
    task.task_type,
    task.form,
    task.order,
  ])
}

BrandChecklist.deleteTask = async task_id => {
  await db.query.promise('brand/checklist/task/delete', [
    task_id
  ])
}


BrandChecklist.addForm = async (checklist, form) => {
  await db.query.promise('brand/checklist/form/add', [
    checklist,
    form
  ])

  return BrandChecklist.get(checklist)
}

BrandChecklist.deleteForm = async (checklist, form) => {
  await db.query.promise('brand/checklist/form/delete', [
    checklist,
    form
  ])
}

BrandChecklist.getByBrand = async brand => {
  const res = await db.query.promise('brand/checklist/by_brand', [brand])

  const ids = res.rows.map(r => r.id)

  return BrandChecklist.getAll(ids)
}

BrandChecklist.associations = {
}

Orm.register('brand_checklist', 'BrandChecklist')

module.exports = BrandChecklist
