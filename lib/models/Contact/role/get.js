const db = require('../../../utils/db')
const sq = require('../../../utils/squel_extensions')

/**
 * @param {IContactRole['id'][]} ids
 * @returns {Promise<IContactRole[]>}
 */
async function getAll (ids) {
  return db.select('contact/role/get', [ids])
}

/**
 * @param {IContactRole['id']} id
 * @returns {Promise<IContactRole>}
 */
async function get (id) {
  const contactRoles = await getAll([id])

  if (contactRoles.length !== 1) {
    throw Error.ResourceNotFound(`Contact Role ${id} Not Found`)
  }

  return contactRoles[0]
}

/**
 * @param {object} opts
 * @param {UUID[] | undefined} [opts.brand]
 * @param {UUID[] | undefined} [opts.contact]
 * @param {UUID[] | undefined} [opts.user]
 * @param {TContactRole[] | undefined} [opts.role]
 * @param {UUID[] | undefined} [opts.created_by]
 * @param {Pick<IContactRole, 'brand' | 'user'>} [opts.brandAndUser]
 * @returns {IContactRole['id'][]}
 */
async function filter (opts) {
  const q = sq
    .select()
    .field('cr.id')
    .from('contact_roles', 'cr')
    .where('cr.deleted_at IS NULL')

  if (Array.isArray(opts.brand)) {
    if (!opts.brand.length) { return [] }
    q.where('cr.brand = ANY(?::uuid[])', sq.SqArray.from(opts.brand))
  }

  if (Array.isArray(opts.contact)) {
    if (!opts.contact.length) { return [] }
    q.where('cr.contact = ANY(?::uuid[])', sq.SqArray.from(opts.contact))
  }

  if (Array.isArray(opts.user)) {
    if (!opts.user.length) { return [] }
    q.where('cr."user" = ANY(?::uuid[])', sq.SqArray.from(opts.user))
  }

  if (Array.isArray(opts.role)) {
    if (!opts.role.length) { return [] }
    q.where('cr.role = ANY(?::contact_role[])', sq.SqArray.from(opts.role))
  }

  if (Array.isArray(opts.created_by)) {
    if (!opts.created_by.length) { return [] }
    q.where('cr.role = ANY(?::uuid[])', sq.SqArray.from(opts.created_by))
  }

  if (Array.isArray(opts.brandAndUser)) {
    if (!opts.brandAndUser.length) { return [] }

    const brandAndUser = sq.rstr(
      'json_to_recordset(?::json) AS _bu(brand uuid, "user" uuid)',
      JSON.stringify(opts.brandAndUser),
    )

    q.join(brandAndUser, null, '_bu.brand = cr.brand AND _bu."user" = cr."user")')
  }

  Object.assign(q, { name: 'contact/role/filter' })
  return db.selectIds(q)
}

module.exports = {
  getAll,
  get,
  filter,
}
