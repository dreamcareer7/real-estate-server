const db = require('../../utils/db')
const Orm = require('../Orm')

const BrandEmail = {}
global['BrandEmail'] = BrandEmail

BrandEmail.get = async id => {
  /** @type {IBrandEmail[]} */
  const emails = await BrandEmail.getAll([id])
  if (emails.length < 1)
    throw Error.ResourceNotFound(`Brand Email ${id} not found`)

  return emails[0]
}

BrandEmail.getAll = async ids => {
  /** @type {IBrandEmail[]} */
  const res = await db.select('brand/email/get', [ids])
  return res
}

BrandEmail.create = async email => {
  const id = await db.insert('brand/email/insert', [
    email.created_by,
    email.brand,
    email.name,
    email.goal,
    email.subject,
    email.include_signature,
    email.body
  ])

  return BrandEmail.get(id)
}

BrandEmail.update = async email => {
  await db.update('brand/email/update', [
    email.id,
    email.name,
    email.goal,
    email.subject,
    email.include_signature,
    email.body
  ])

  return BrandEmail.get(email.id)
}

BrandEmail.delete = async id => {
  await db.update('brand/email/remove', [
    id
  ])
}

BrandEmail.getByBrand = async brand => {
  const ids = await db.selectIds('brand/email/by_brand', [brand])

  return BrandEmail.getAll(ids)
}

BrandEmail.associations = {}

Orm.register('brand_email', 'BrandEmail', BrandEmail)

module.exports = BrandEmail
