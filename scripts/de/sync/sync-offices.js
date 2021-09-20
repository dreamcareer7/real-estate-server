const _ = require('lodash')
const parser = require('parse-address')

const Brand = require('../../../lib/models/Brand')
const BrandRole = require('../../../lib/models/Brand/role/save')

const db = require('../../../lib/utils/db')

const INSERT = 'INSERT INTO de.offices(id, brand, admin_role) VALUES ($1, $2, $3)'

const add = async id => {
  const brand = await Brand.create({
    brand_type: Brand.OFFICE,
    name: 'New & Untitled',
  })

  console.log('Creating brand', id)
  const admin = await BrandRole.create({
    brand: brand.id,
    role: 'Admin',
    acl: ['BackOffice', 'Marketing']
  })

  await db.executeSql.promise(INSERT, [
    id,
    brand.id,
    admin.id,
  ])
}

const GET = 'SELECT * FROM de.offices'

const createNew = async offices => {
  const { rows } = await db.executeSql.promise(GET)

  const existing = _.map(rows, 'id').sort()

  const not_existing = _.difference(_.map(offices, 'id').sort(), existing)

  await Promise.all(not_existing.map(add))
}

const UPDATE = `
WITH data AS (
 SELECT * FROM json_to_recordset($1)
 as input(id INT, name TEXT, region TEXT)
 JOIN de.offices ON input.id = de.offices.id
),
u AS (
  UPDATE brands SET
    name = data.name,
    parent = (SELECT brand FROM de.regions WHERE name = data.region)
  FROM data
  WHERE brands.id = data.brand
  )
SELECT NOW()
`

const update = async offices => {
  await db.executeSql.promise(UPDATE, [
    JSON.stringify(offices.map(o => {
      return {
        id: o.id,
        name: o.name,
        region: o.majorRegion
      }
    })
    )
  ])
}

const UPDATE_SETTINGS = `
WITH data AS (
 SELECT * FROM json_to_recordset($1)
 as input(id INT, address JSONB)
 JOIN de.offices ON input.id = de.offices.id
)
UPDATE brand_settings SET
  address = JSON_TO_STDADDR(data.address)
FROM data
WHERE brand_settings.brand = data.brand`

const updateSettings = async offices => {
  const mapped = offices.map(office => {
    const { address } = office
    const parsed = parser.parseLocation(address)

    return {
      id: office.id,
      address: {
        house_num: parsed.number,
        predir: parsed.prefix,
        pretype: parsed.type,
        name: parsed.street,
        suftype: parsed.suffix,
        city: parsed.city || office.city,
        state: parsed.state || office.state,
        country: parsed.country,
        postcode: parsed.zip || office.zip,
        unit: parsed.sec_unit_num
      }
    }
  })

  await db.executeSql.promise(UPDATE_SETTINGS, [
    JSON.stringify(mapped)
  ])
}

const UPDATE_ADMINS = `
WITH admins AS (
  SELECT input.* FROM json_to_recordset($1) AS input(username TEXT, office INT)
  JOIN de.users ON input.username = de.users.username
),

saved AS (
  INSERT INTO de.admins_offices (username, office)
  SELECT username, office FROM admins
  ON CONFLICT DO NOTHING
  RETURNING *
)

INSERT INTO brands_users(role, "user")
SELECT de.offices.admin_role, de.users.user
FROM admins
JOIN de.offices ON admins.office   = de.offices.id
JOIN de.users   ON admins.username = de.users.username
ON CONFLICT ("user", role) DO UPDATE SET deleted_at = NULL
RETURNING *
`

const DISABLE_ALL = `
UPDATE brands_users SET deleted_at = COALESCE(deleted_at, NOW())
FROM de.admins_offices
JOIN de.offices ON de.admins_offices.office = de.offices.id
JOIN de.users ON de.admins_offices.username = de.users.username
WHERE brands_users.user = de.users.user AND brands_users.role = de.offices.admin_role`

const syncAdmins = async offices => {
  const admins = []

  offices.forEach(office => {
    office.managers.forEach(m => {
      admins.push({
        username: m.username,
        office: office.id
      })
    })

    office.admins.forEach(a => {
      admins.push({
        username: a.username,
        office: office.id
      })
    })
  })

  await db.executeSql.promise(DISABLE_ALL)

  await db.executeSql.promise(UPDATE_ADMINS, [
    JSON.stringify(admins)
  ])
}

const syncOffices = async offices => {
  await createNew(offices)
  await update(offices)
  await updateSettings(offices)

  await syncAdmins(offices)
}

module.exports = syncOffices
