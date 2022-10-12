const db = require('../../../../utils/db')

const BrandChecklist = {
  ...require('./get'),
  ...require('./constants')
}

BrandChecklist.create = async checklist => {
  const res = await db.query.promise('brand/checklist/insert', [
    checklist.brand,
    checklist.title,
    checklist.checklist_type,
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
    checklist.checklist_type,
    checklist.property_type,
    checklist.order,
    checklist.is_terminatable,
    checklist.is_deactivatable,
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
    task.checklist,
    task.required,
    task.tab_name,
    task.acl
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
    task.required,
    task.tab_name,
    task.acl
  ])
}

BrandChecklist.deleteTask = async task_id => {
  await db.query.promise('brand/checklist/task/delete', [
    task_id
  ])
}

BrandChecklist.sort = async pairs => {
  return db.query.promise('brand/checklist/task/sort', [
    JSON.stringify(pairs)
  ])
}

module.exports = BrandChecklist
