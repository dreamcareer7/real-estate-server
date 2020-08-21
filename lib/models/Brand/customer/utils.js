const Context = require('../../Context/index')
const db = require('../../../utils/db')

const { get } = require('./get')

const chargebee = require('../chargebee')

const getByBrand = async (brand_id, user) => {
  const row = await db.selectOne('brand/customer/by-brand', [
    brand_id
  ])

  if (row)
    return get(row.id)

  const { first_name, last_name, email } = user

  const data = {
    first_name,
    last_name,
    email
  }

  const { customer } = await chargebee.customer.create(data).request()

  return set(brand_id, user.id, customer)
}

const set = async (brand_id, user_id, customer) => {
  const { rows } = await db.query.promise('brand/customer/set', [
    brand_id,
    user_id,
    customer.id,
    JSON.stringify(customer),
    Context.getId()
  ])

  return get(rows[0].id)
}

const sync = async chargebee_id => {
  const latest = await chargebee.customer.retrieve(chargebee_id).request()

  await db.query.promise('brand/customer/update', [
    chargebee_id,
    JSON.stringify(latest),
    Context.getId()
  ])
}

module.exports = {
  getByBrand,
  set,
  sync
}
