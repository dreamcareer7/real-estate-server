const _ = require('lodash')
const db = require('../../../lib/utils/db')
const Brand = require('../../../lib/models/Brand')
const BrandRole = {
  ...require('../../../lib/models/Brand/role/get'),
  ...require('../../../lib/models/Brand/role/save'),
  ...require('../../../lib/models/Brand/role/members'),
}

const GET_USER_OFFICES = 'SELECT * FROM de.agents_offices'

const DISABLE_NONEXISTING_USERS = `
UPDATE brands_roles SET
  deleted_at = (
    CASE
      WHEN input.username IS NULL THEN COALESCE(deleted_at, NOW())
    ELSE
      NULL
    END
  )
FROM de.agents_offices
JOIN json_to_recordset($1) as input("username" TEXT, office INT)
ON de.agents_offices.username = input.username AND de.agents_offices.office = input.office
WHERE brands_roles.id = de.agents_offices.agent_role
RETURNING input.username, input.office`

const UPDATE_BRANDS = `
UPDATE brands
  SET parent = de.offices.brand
FROM de.agents_offices
JOIN de.offices ON de.agents_offices.office = de.offices.id
WHERE brands.id = de.agents_offices.brand
`

const syncAgents = async users => {
  const { rows: existing } = await db.executeSql.promise(GET_USER_OFFICES)

  const promises = []
  const current = []

  users.forEach(user => {
    user.offices.forEach(office => {
      current.push({
        id: user.id,
        office: office.id
      })

      const found = _.find(existing, {
        username: user.username,
        office: office.id
      })
      if (found)
        return

      promises.push(addUserToOffice({user, office}))
    })
  })

  await Promise.all(promises)

  await db.executeSql.promise(UPDATE_BRANDS)

  const { rows: deletedRoles } = await db.executeSql.promise(DISABLE_NONEXISTING_USERS, [
    JSON.stringify(current)
  ])

  deletedRoles.forEach(deleted => {
    console.log('Deleted', deleted.username, 'on office', deleted.office)
  })
}

const SAVE = `INSERT INTO de.agents_offices (
  username, office, "user", brand, agent_role
)
VALUES ($1, $2, (
  SELECT id FROM users WHERE LOWER(email) = LOWER($3)
), $4, $5)
RETURNING *`

const addUserToOffice = async ({user, office}) => {
  console.log('Creating brand for', user.email)
  const brand = await Brand.create({
    name: `${user.firstName} ${user.lastName}`,
    brand_type: Brand.PERSONAL
  })

  const role = await BrandRole.create({
    brand: brand.id,
    role: 'Agent',
    acl: ['Marketing', 'AgentNetwork', 'Deals', 'CRM', 'Websites']
  })


  const { rows } = await db.executeSql.promise(SAVE, [
    user.username,
    office.id,
    user.email,
    brand.id,
    role.id
  ])

  const [ row ] = rows

  await BrandRole.addMember({
    user: row.user,
    role: role.id
  })
}

module.exports = syncAgents
