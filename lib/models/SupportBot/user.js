const Contact = require('../Contact/emitter')
const Context = require('../Context')
const Orm = require('../Orm/index')
const User = require('../User')

const sql = require('../../utils/sql')
const { expect } = require('../../utils/validator.js')

const { getTokenForUser } = require('./token')
const { getBrandsForEmail } = require('./brand')

async function getUserById(user_id) {
  const raw = await User.get(user_id)
  return Orm.populate({
    models: [raw],
    associations: ['user.docusign']
  })
}

/**
 * @param {string} query 
 */
async function findUser(query) {
  if (query.includes('@')) {
    return getUserByEmail(query.toLowerCase())
  }

  const res = await sql.select(`
    SELECT
      email
    FROM
      users
    WHERE
      first_name || ' ' || last_name ilike $1
      AND is_shadow IS FALSE
      AND deleted_at IS NULL
      AND email_confirmed IS TRUE
    ORDER BY
      last_seen_at DESC
    LIMIT 1`, [
    '%' + query.replace(/\s+/g, '%') + '%'
  ])

  if (res.length > 0) {
    return getUserByEmail(res[0].email)
  }

  throw Error.ResourceNotFound('No user found!')
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

async function getLoginLink(id) {
  const user = await User.get(id)
  return await User.getLoginLink({user})
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
      AND deleted_at IS NULL
    RETURNING
      id
  `, [
    user_id,
    brand_id
  ])
}

async function moveUserCrmTasks(user_id, brand_id) {
  Context.log('moveUserCrmTasks')

  return sql.selectIds(`
    WITH tids AS (
      UPDATE
        crm_tasks
      SET
        brand = $2::uuid
      WHERE
        created_by = $1
        AND deleted_at IS NULL
      RETURNING
        id
    )
    UPDATE
      crm_associations AS a
    SET
      brand = $2::uuid
    FROM
      tids
    WHERE
      a.crm_task = tids.id
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
      AND deleted_at IS NULL
  `, [
    user_id,
    brand_id
  ])
}

async function moveUserTags(user_id, brand_id) {
  Context.log('moveUserTags')

  return await sql.update(`
    UPDATE
      crm_tags
    SET
      brand = $2
    WHERE
      created_by = $1
      AND deleted_at IS NULL
      AND NOT EXISTS (
        SELECT
          1
        FROM
          crm_tags t
        WHERE
          t.brand = crm_tags.brand
          AND t.tag = crm_tags.tag
      )
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
      AND deleted_at IS NULL
  `, [
    user_id,
    brand_id
  ])
}

async function moveEmailCampaigns(user_id, brand_id) {
  Context.log('moveEmailCampaigns')

  return await sql.update(`
    UPDATE
      email_campaigns
    SET
      brand = $2
    WHERE
      created_by = $1
      AND deleted_at IS NULL
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
      AND deleted_at IS NULL
  `, [
    user_id,
    brand_id
  ])
}

async function moveGoogleCredentials(user_id, brand_id) {
  Context.log('moveUserCampaigns')

  return await sql.update(`
    UPDATE
      google_credentials
    SET
      brand = $2
    WHERE
      revoked IS FALSE
      AND deleted_at IS NULL
      AND "user" = $1
  `, [
    user_id,
    brand_id
  ])
}

async function moveMicrosoftCredentials(user_id, brand_id) {
  Context.log('moveUserCampaigns')

  return await sql.update(`
    UPDATE
      microsoft_credentials
    SET
      brand = $2
    WHERE
      revoked IS FALSE
      AND deleted_at IS NULL
      AND "user" = $1
  `, [
    user_id,
    brand_id
  ])
}

async function moveCRMDataForUser(user_id, brand_id) {
  expect(user_id).to.be.uuid
  expect(brand_id).to.be.uuid

  const contact_ids = await moveUserContacts(user_id, brand_id)
  await moveUserTags(user_id, brand_id)
  await moveUserCustomAttrs(user_id, brand_id)
  await moveUserLists(user_id, brand_id)
  await moveUserCrmTasks(user_id, brand_id)
  await moveEmailCampaigns(user_id, brand_id)
  await moveGoogleCredentials(user_id, brand_id)
  await moveMicrosoftCredentials(user_id, brand_id)

  Contact.emit('update:brand', {
    contact_ids,
    brand_id
  })
}

module.exports = {
  findUser,
  getUserById,
  getUserByEmail,
  getLoginLink,
  disconnectDocuSign,
  moveUserContacts,
  moveUserCustomAttrs,
  moveUserLists,
  moveUserTasks,
  moveEmailCampaigns,
  moveCRMDataForUser,
  moveGoogleCredentials,
  moveMicrosoftCredentials
}
