const Contact = require('../Contact')
const Context = require('../Context')
const Orm = require('../Orm')
const User = require('../User/index')

const sql = require('../../utils/sql')
const { expect } = require('../../utils/validator.js')

const { getTokenForUser } = require('./token')
const { getBrandsForEmail } = require('./brand')

async function getUserById(user_id) {
  const raw = await User.get(user_id)
  return Orm.populate({
    models: [raw]
  })
}

async function getUserByEmail(email) {
  const user_id = await sql.selectId('SELECT id FROM users WHERE email = $1', [
    email
  ])

  const populated = await getUserById(user_id)
  const user = populated[0]

  try {
    user.token = await getTokenForUser(email)
  } catch (ex) {
    //
  }

  try {
    user.teams = await getBrandsForEmail(email)
  } catch (ex) {
    user.teams = []
  }

  return user
}

async function disconnectDocuSign(email) {
  await sql.update(`DELETE FROM docusign_users WHERE "user" = (
    SELECT id FROM users WHERE email = $1
  )`, [email])
}

async function moveUserContacts(user_id, brand_id) {
  Context.log('moveUserContacts')

  return sql.selectIds(`
    UPDATE
      contacts
    SET
      brand = $2
    WHERE
      "user" = $1
    RETURNING
      id
  `, [
    user_id,
    brand_id
  ])
}

async function moveUserCustomAttrs(user_id, brand_id) {
  Context.log('moveUserCustomAttrs')
  return await sql.update(`
    UPDATE
      contacts_attribute_defs
    SET
      brand = $2
    WHERE
      created_by = $1
  `, [
    user_id,
    brand_id
  ])
}

async function moveUserLists(user_id, brand_id) {
  Context.log('moveUserLists')

  return await sql.update(`
    UPDATE
      crm_lists
    SET
      brand = $2
    WHERE
      created_by = $1
  `, [
    user_id,
    brand_id
  ])
}

async function moveUserTasks(user_id, brand_id) {
  Context.log('moveUserTasks')

  return await sql.update(`
    UPDATE
      crm_tasks
    SET
      brand = $2
    WHERE
      created_by = $1
  `, [
    user_id,
    brand_id
  ])
}

async function moveCRMDataForUser(user_id, brand_id) {
  expect(user_id).to.be.uuid
  expect(brand_id).to.be.uuid

  const contact_ids = await moveUserContacts(user_id, brand_id)
  await moveUserCustomAttrs(user_id, brand_id)
  await moveUserLists(user_id, brand_id)
  await moveUserTasks(user_id, brand_id)

  Contact.emit('update:brand', {
    contact_ids,
    brand_id
  })
}

module.exports = {
  getUserById,
  getUserByEmail,
  disconnectDocuSign,
  moveUserContacts,
  moveUserCustomAttrs,
  moveUserLists,
  moveUserTasks,
  moveCRMDataForUser
}
