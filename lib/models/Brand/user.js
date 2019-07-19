const db = require('../../utils/db')
const Orm = require('../Orm')

BrandUser = {}

BrandUser.get = async id => {
  const users = await BrandUser.getAll([id])

  if (users.length < 1)
    throw Error.ResourceNotFound(`Brand User ${id} not found`)

  return users[0]
}

BrandUser.getAll = async ids => {
  return db.select('brand/role/member/get', [ids])
}

BrandUser.associations = {
  user: {
    model: 'User'
  }
}

Orm.register('brand_user', 'BrandUser', BrandUser)
