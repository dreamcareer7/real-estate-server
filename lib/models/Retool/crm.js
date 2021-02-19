const Contact = require('../Contact/emitter')
const Context = require('../Context')
const Orm = require('../Orm/index')
const User = require('../User')

const sql = require('../../utils/sql')
const { expect } = require('../../utils/validator.js')

async function getUserById(user_id) {
  const raw = await User.get(user_id)
  return Orm.populate({
    models: [raw],
    associations: ['user.docusign']
  })
}

async function moveUserContacts(user_id, source_brand, dest_brand) {
  Context.log('moveUserContacts')

  return sql.selectIds(`
    UPDATE
      contacts
    SET
      brand = $3
    WHERE
      "user" = $1
      AND brand = $2
      AND deleted_at IS NULL
      AND 
    RETURNING
      id
  `, [
    user_id,
    source_brand,
    dest_brand
  ])
}

async function moveUserCustomAttrs(user_id, source_brand, dest_brand) {
  Context.log('moveUserCustomAttrs')
  return await sql.update(`
    UPDATE
      contacts_attribute_defs
    SET
      brand = $3
    WHERE
      created_by = $1
      AND brand = $2
      AND deleted_at IS NULL
  `, [
    user_id,
    source_brand,
    dest_brand
  ])
}

async function moveUserTags(user_id, source_brand, dest_brand) {
  Context.log('moveUserTags')

  return await sql.update(`
    UPDATE
      crm_tags
    SET
      brand = $3
    WHERE
      created_by = $1
      AND brand = $2
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
    source_brand,
    dest_brand
  ])
}

async function moveUserLists(user_id, source_brand, dest_brand) {
  Context.log('moveUserLists')

  return await sql.update(`
    UPDATE
      crm_lists
    SET
      brand = $3
    WHERE
      created_by = $1
      AND brand = $2
      AND deleted_at IS NULL
  `, [
    user_id,
    source_brand,
    dest_brand
  ])
}

async function moveEmailCampaigns(user_id, source_brand, dest_brand) {
  Context.log('moveEmailCampaigns')

  return await sql.update(`
    UPDATE
      email_campaigns
    SET
      brand = $3
    WHERE
      created_by = $1
      AND brand = $2
      AND deleted_at IS NULL
  `, [
    user_id,
    source_brand,
    dest_brand
  ])
}

async function moveUserTasks(user_id, source_brand, dest_brand) {
  Context.log('moveUserTasks')

  return await sql.update(`
    UPDATE
      crm_tasks
    SET
      brand = $3
    WHERE
      created_by = $1
      AND brand = $2
      AND deleted_at IS NULL
  `, [
    user_id,
    source_brand,
    dest_brand
  ])
}

async function moveGoogleCredentials(user_id, source_brand, dest_brand) {
  Context.log('moveUserCampaigns')

  return await sql.update(`
    UPDATE
      google_credentials
    SET
      brand = $3
    WHERE
      revoked IS FALSE
      AND brand = $2
      AND deleted_at IS NULL
      AND "user" = $1
  `, [
    user_id,
    source_brand,
    dest_brand
  ])
}

async function moveMicrosoftCredentials(user_id, source_brand, dest_brand) {
  Context.log('moveUserCampaigns')

  return await sql.update(`
    UPDATE
      microsoft_credentials
    SET
      brand = $3
    WHERE
      revoked IS FALSE
      AND brand = $2
      AND deleted_at IS NULL
      AND "user" = $1
  `, [
    user_id,
    source_brand,
    dest_brand
  ])
}

async function moveCRMDataForUser(user_id, source_brand, dest_brand) {
  expect(user_id).to.be.uuid
  expect(dest_brand).to.be.uuid

  const contact_ids = await moveUserContacts(user_id, source_brand, dest_brand)
  await moveUserTags(user_id, source_brand, dest_brand)
  await moveUserCustomAttrs(user_id, source_brand, dest_brand)
  await moveUserLists(user_id, source_brand, dest_brand)
  await moveUserTasks(user_id, source_brand, dest_brand)
  await moveEmailCampaigns(user_id, source_brand, dest_brand)
  await moveGoogleCredentials(user_id, source_brand, dest_brand)
  await moveMicrosoftCredentials(user_id, source_brand, dest_brand)

  Contact.emit('update:brand', {
    contact_ids,
    brand_id: dest_brand
  })
}

module.exports = {
  getUserById,
  moveUserContacts,
  moveUserCustomAttrs,
  moveUserLists,
  moveUserTasks,
  moveEmailCampaigns,
  moveCRMDataForUser,
  moveGoogleCredentials,
  moveMicrosoftCredentials
}
