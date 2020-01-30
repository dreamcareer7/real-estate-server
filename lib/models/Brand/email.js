const db = require('../../utils/db')
const Orm = require('../Orm')
const render = require('../../utils/render')
const htmlToText = require('html-to-text')


const BrandEmail = {}
global['BrandEmail'] = BrandEmail

const validate = async email => {
  const { body, subject } = email

  try {
    const subjectCompiler = await render.compileText(subject || '')
    subjectCompiler.release()
  } catch(e) {
    Context.log(e)
    throw Error.Validation('Error in formatting of subject')
  }

  try {
    const htmlBodyCompiler = await render.compileHtml(body || '')
    htmlBodyCompiler.release()
  } catch(e) {
    Context.error(e)
    throw Error.Validation('Error in formatting of body')
  }
}

/**
 * @param {UUID} id
 */
BrandEmail.get = async id => {
  /** @type {IBrandEmail[]} */
  const emails = await BrandEmail.getAll([id])
  if (emails.length < 1)
    throw Error.ResourceNotFound(`Brand Email ${id} not found`)

  return emails[0]
}

/**
 * @param {UUID[]} ids
 */
BrandEmail.getAll = async ids => {
  /** @type {IBrandEmail[]} */
  const res = await db.select('brand/email/get', [ids])
  return res
}

/**
 * @param {IBrandEmailInput & { created_by: UUID; brand: UUID; }} email
 */
BrandEmail.create = async email => {
  await validate(email)

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

/**
 * @param {IBrandEmailInput & { id: UUID; }} email
 */
BrandEmail.update = async email => {
  await validate(email)

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

/**
 * @param {UUID} id
 */
BrandEmail.delete = async id => {
  await db.update('brand/email/remove', [
    id
  ])
}

/**
 * @param {UUID} brand
 */
BrandEmail.getByBrand = async brand => {
  const ids = await db.selectIds('brand/email/by_brand', [brand])

  return BrandEmail.getAll(ids)
}

BrandEmail.publicize = model => {
  model.text = htmlToText.fromString(model.body, {
    ignoreImage: true,
    noLinkBrackets: true
  })
}

BrandEmail.associations = {}

Orm.register('brand_email', 'BrandEmail', BrandEmail)

module.exports = BrandEmail
