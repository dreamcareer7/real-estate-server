const { EventEmitter } = require('events')
const _ = require('lodash')

const db = require('../../utils/db')
const Orm = require('../Orm')

class BrandRole extends EventEmitter {
  async get(id) {
    const roles = await this.getAll([id])

    if (roles.length < 1)
      throw Error.ResourceNotFound(`Brand Role ${id} not found`)

    return roles[0]
  }

  async getAll(ids) {
    const users = Orm.getAssociationConditions('brand_role.members') || null
    return db.select('brand/role/get', [ids, users])
  }

  async getByBrand(brand) {
    const ids = await db.selectIds('brand/role/by_brand', [
      brand
    ])

    return this.getAll(ids)
  }

  async getByUser(brand, user) {
    return db.selectIds('brand/role/by_user', [
      brand,
      user
    ])
  }

  async create({brand, role, acl}) {
    const id = await db.insert('brand/role/insert', [
      brand,
      role,
      acl
    ])

    return Model.get(id)
  }

  async update({id, role, acl}) {
    await db.update('brand/role/update', [
      id,
      role,
      acl
    ])
  
    return Model.get(id)
  }

  async delete(id) {
    return db.update('brand/role/delete', [id])
  }

  async addMember({role, user}) {
    await db.insert('brand/role/member/add', [
      role,
      user
    ])

    this.emit('member:join', {
      role,
      user
    })
  }
  
  async removeMember(role, user) {
    await db.update('brand/role/member/remove', [
      role,
      user
    ])

    this.emit('member:leave', {
      role,
      user
    })
  }
  
  /**
   * Get role member user_ids
   * @param {UUID} role 
   * @returns {Promise<UUID[]>}
   */
  async getMembers(role) {
    return db.map('brand/role/member/by_role', [role], 'user')
  }
}

/**
 * @param {{brand: UUID; user: UUID; roles?: string[]}} arg1
 */
Brand.limitAccess = async ({brand, user, roles}) => {
  const brands_access = await Brand.hasAccessToBrands([brand], user, roles)

  if (!brands_access[brand])
    throw Error.Forbidden('Access denied to brand resource')
}

/**
 * Checks whether a user has access to a number of brands
 * @param {Iterable<UUID>} brands 
 * @param {UUID} user 
 */
Brand.hasAccessToBrands = async (brands, user, acl) => {
  const user_access = await UserRole.getForUser(user)
  const indexed = _.keyBy(user_access, 'brand')

  const access = {}
  for(const brand_id of brands) {
    const user_brand_acess = indexed[brand_id]

    // User has nothing to do with this brand. Not a member.
    if (!user_brand_acess) {
      access[brand_id] = false
      continue
    }

    // User is a member and we don't care about any specific ACL
    if (!acl || acl.length === 0) {
      access[brand_id] = true
    }

    // User is a member and we care about a specific ACL list
    access[brand_id] = _.difference(acl, user_brand_acess.acl).length === 0
  }

  return access
}

Brand.isSubMember = async (brand, user) => {
  const { is } = await db.selectOne('brand/is_sub_member', [brand, user])
  return Boolean(is)
}


BrandRole.prototype.associations = {
  users: {
    collection: true,
    enabled: false,
    model: 'BrandUser'
  }
}

const Model = new BrandRole
global['BrandRole'] = Model

Orm.register('brand_role', 'BrandRole', Model)
module.exports = Model
