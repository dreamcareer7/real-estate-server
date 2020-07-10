const chargebee = require('../chargebee')
const db = require('../../../utils/db')
const Orm = require('../../Orm')

const BrandCustomer = {}

BrandCustomer.get = async id => {
  const customer = await BrandCustomer.getAll([id])
  if (customer.length < 1)
    throw Error.ResourceNotFound(`Customer ${id} not found`)

  return customer[0]
}

BrandCustomer.getAll = async ids => {
  return await db.select('brand/customer/get', [ids])
}

BrandCustomer.getByBrand = async (brand_id, user) => {
  const row = await db.selectOne('brand/customer/by-brand', [
    brand_id
  ])

  if (row)
    return BrandCustomer.get(row.id)

  const { first_name, last_name, email } = user

  const data = {
    first_name,
    last_name,
    email
  }

  const { customer } = await chargebee.customer.create(data).request()

  return BrandCustomer.set(brand_id, user.id, customer)
}

BrandCustomer.set = async (brand_id, user_id, customer) => {
  const { rows } = await db.query.promise('brand/customer/set', [
    brand_id,
    user_id,
    customer.id,
    JSON.stringify(customer),
    Context.getId()
  ])

  return BrandCustomer.get(rows[0].id)
}

BrandCustomer.sync = async chargebee_id => {
  const latest = await chargebee.customer.retrieve(chargebee_id).request()

  await db.query.promise('brand/customer/update', [
    chargebee_id,
    JSON.stringify(latest),
    Context.getId()
  ])
}

BrandCustomer.publicize = model => {
  delete model.chargebee_object
}

Orm.register('brand_customer', 'BrandCustomer', BrandCustomer)

module.exports = BrandCustomer
