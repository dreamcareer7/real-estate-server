const db = require('../../../../utils/db')

const { get } = require('./get')
const BrandChecklist = require('../checklist')

const create = async property_type => {
  const id = await db.insert('brand/deal/property_type/insert', [
    property_type.brand,
    property_type.label,
    property_type.is_lease || false,
    property_type.required_roles,
    property_type.optional_roles
  ])

  await BrandChecklist.create({
    brand: property_type.brand,
    title: 'Listing',
    checklist_type: BrandChecklist.SELLING,
    property_type: id,
    order: 0,
    is_deactivatable: false,
    is_terminatable: false,
    tab_name: 'Listing'
  })

  await BrandChecklist.create({
    brand: property_type.brand,
    title: 'Offer',
    checklist_type: BrandChecklist.OFFER,
    property_type: id,
    order: 1,
    is_deactivatable: true,
    is_terminatable: true,
    tab_name: 'Contract'
  })

  await BrandChecklist.create({
    brand: property_type.brand,
    title: 'Contract',
    checklist_type: BrandChecklist.BUYING,
    property_type: id,
    order: 0,
    is_deactivatable: false,
    is_terminatable: false,
    tab_name: 'Contract'
  })

  return get(id)
}

const update = async property_type => {
  await db.query.promise('brand/deal/property_type/update', [
    property_type.id,
    property_type.label,
    property_type.is_lease || false,
    property_type.required_roles,
    property_type.optional_roles
  ])

  return get(property_type.id)
}

const remove = async id => {
  return db.query.promise('brand/deal/property_type/remove', [
    id
  ])
}

const sort = async items => {
  return db.query.promise('brand/deal/property_type/sort', [
    JSON.stringify(items)
  ])
}

module.exports = {
  create,
  update,
  remove,
  sort
}
