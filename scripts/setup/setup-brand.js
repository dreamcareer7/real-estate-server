/* eslint-disable */

const promisify = require('../../lib/utils/promisify')
const Brand = require('../../lib/models/Brand/index')
const BrandRole = require('../../lib/models/Brand/role')
const sql = require('../../lib/models/SupportBot/sql')

/**
 * @param {UUID} user_id
 */
async function createBrandForUser(user_id) {
  var brand_data, brand, role, user

  user = await User.get(user_id)

  brand_data = {
    palette: {
      primary: 'red'
    },
    assets: {},
    messages: {}
  }

  brand = await Brand.create({
    ...brand_data,
    name: `${user.display_name}'s Personal brand`
  })

  role = await BrandRole.create({
    brand: brand.id,
    role: {
      role: 'Default',
      acl: []
    },
    acl: ['CRM', 'Deals']
  })

  await BrandRole.addMember({
    user: user.id,
    role: role.id
  })

  try {
    await sql.selectId(`
      INSERT INTO users_solo_brands
        (id, brand)
      VALUES
        ($1, $2)
    `, [
      user_id,
      brand.id
    ])
  }
  finally {
    // ignore errirs
  }

  return await Brand.get(brand.id)
}
