const { EventEmitter } = require('events')

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


BrandRole.prototype.associations = {
  users: {
    collection: true,
    enabled: false,
    model: 'BrandUser'
  }
}

const Model = new BrandRole

Orm.register('brand_role', 'BrandRole', Model)
module.exports = Model
