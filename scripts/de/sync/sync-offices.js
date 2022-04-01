const _ = require('lodash')
const parser = require('parse-address')
const pnu = require('google-libphonenumber').PhoneNumberUtil.getInstance()

const Brand = require('../../../lib/models/Brand')
const BrandRole = require('../../../lib/models/Brand/role/save')

const Context = require('../../../lib/models/Context')

const db = require('../../../lib/utils/db')

const INSERT = 'INSERT INTO de.offices(id, brand, admin_role) VALUES ($1, $2, $3)'

const UPDATE = `WITH data AS(
  SELECT * FROM json_to_recordset($1) as input(id INT, business_locations TEXT[])
)
UPDATE de.offices SET business_locations = data.business_locations
FROM data WHERE de.offices.id = data.id`

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

const save = async offices => {
  const { rows } = await db.executeSql.promise(GET)

  const existing = _.map(rows, 'id').sort()
  const not_existing = _.difference(_.map(offices, 'id').sort(), existing)

  await Promise.all(not_existing.map(add))

  await db.executeSql.promise(UPDATE, [
    JSON.stringify(offices.map(o => {
      return {
        ...o,
        business_locations: o.businessLocations.map(b => b.businessLocation)
      }
    }))
  ])
}

const UPDATE_BRANDS = `
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

const updateBrands = async offices => {
  await db.executeSql.promise(UPDATE_BRANDS, [
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
 as input(id INT, address JSONB, phone_number TEXT)
 JOIN de.offices ON input.id = de.offices.id
)
UPDATE brand_settings SET
  address = JSON_TO_STDADDR(data.address),
  marketing_palette =  JSON_TO_MARKETING_PALETTE(
    COALESCE(MARKETING_PALETTE_TO_JSON(null::marketing_palette)::jsonb, '{}'::jsonb)
      ||
    JSON_BUILD_OBJECT('phone_number', data.phone_number)::jsonb
  )
FROM data
WHERE brand_settings.brand = data.brand`

const updateSettings = async offices => {
  const mapped = offices.map(office => {
    const { address } = office
    const parsed = parser.parseLocation(address)

    let phone_number = office.phone
    if (phone_number) {
      try {
        const parsed = pnu.parse(phone_number, 'US')
        phone_number = pnu.formatNumberForMobileDialing(parsed)
      } catch(e) {
        Context.log('Invalid phone', phone_number, 'for', office.id, e)
      }
    }

    return {
      id: office.id,
      phone_number,
      address: {
        house_num: parsed?.number,
        predir: parsed?.prefix,
        pretype: parsed?.type,
        name: parsed?.street,
        suftype: parsed?.suffix,
        city: parsed?.city || office.city,
        state: parsed?.state || office.state,
        country: parsed?.country,
        postcode: parsed?.zip || office.zip,
        unit: parsed?.sec_unit_num
      }
    }
  })

  await db.executeSql.promise(UPDATE_SETTINGS, [
    JSON.stringify(mapped)
  ])
}

const UPDATE_ADMINS = `
WITH admins AS (
  SELECT input.* FROM json_to_recordset($1) AS input(key TEXT, office INT)
  JOIN de.users ON input.key = de.users.key
),

saved AS (
  INSERT INTO de.admins_offices (key, office)
  SELECT key, office FROM admins
  ON CONFLICT DO NOTHING
  RETURNING *
)

INSERT INTO brands_users(role, "user")
SELECT de.offices.admin_role, de.users.user
FROM admins
JOIN de.offices ON admins.office   = de.offices.id
JOIN de.users   ON admins.key = de.users.key
ON CONFLICT ("user", role) DO UPDATE SET deleted_at = NULL
RETURNING *
`

const DISABLE_ALL = `
UPDATE brands_users SET deleted_at = COALESCE(brands_users.deleted_at, NOW())
FROM de.admins_offices
JOIN de.offices ON de.admins_offices.office = de.offices.id
JOIN de.users ON de.admins_offices.key = de.users.key
WHERE brands_users.user = de.users.user AND brands_users.role = de.offices.admin_role`

const syncAdmins = async offices => {
  const admins = []

  offices.forEach(office => {
    office.managers.forEach(m => {
      admins.push({
        key: m.key,
        office: office.id
      })
    })

    office.admins.forEach(a => {
      admins.push({
        key: a.key,
        office: office.id
      })
    })
  })

  /*
   * Uniqued so the query wouldn't need to run ON CONFLICT twice on a row
   * Which  would fail on pg
   */

  const uniqued = _.uniqWith(admins, (a,b) => {
    return a.key === b.key && a.office === b.office
  })

  await db.executeSql.promise(DISABLE_ALL)

  await db.executeSql.promise(UPDATE_ADMINS, [
    JSON.stringify(uniqued)
  ])
}

const syncOffices = async offices => {
  await save(offices)
  await updateBrands(offices)
  await updateSettings(offices)

  await syncAdmins(offices)
}

module.exports = syncOffices
