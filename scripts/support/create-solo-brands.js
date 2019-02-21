const { Bar: ProgressBar, Presets } = require('cli-progress')

const sql = require('../../lib/utils/sql')
const Brand = require('../../lib/models/Brand')
const BrandRole = require('../../lib/models/Brand/role')
const runInContext = require('../../lib/models/Context/util')

const brand_data = {
  palette: {
    primary: 'red'
  },
  assets: {},
  messages: {},
  role: 'Agent'
}

async function getCrmUsersWithoutBrand() {
  return sql.select(`select
    id,
    email,
    features
  from
    users
  where
    id in ((
        (
            select
                distinct "user"
            from
                contacts
            where
                deleted_at is null
        ) UNION (
            SELECT
                distinct created_by as "user"
            FROM
                crm_tasks
            WHERE
                deleted_at is null
        ) UNION (
            SELECT
                distinct "user"
            FROM
                contact_search_lists
            WHERE
                deleted_at is null
        ) UNION (
            SELECT
                distinct "user"
            FROM
                contacts_attribute_defs
            WHERE
                deleted_at is null
                AND "user" IS NOT NULL
        )
    ) except (
        select
            distinct bu."user"
        from
            brands_users bu
            join brands_roles br
              on br.id = bu.role
            join brands b
              on br.brand = b.id
        where
            b.deleted_at is null
            and br.deleted_at is null
        )
    )
    AND deleted_at IS NULL
  ORDER BY
    id;`, [])
}

async function createSoloBrand(user) {
  const brand = await Brand.create({
    ...brand_data,
    name: /^\s*$/.test(user.name) ? 'Personal Team' : `${user.name}'s Team`
  })

  const role = await BrandRole.create({
    brand: brand.id,
    role: 'Agent',
    acl: ['CRM']
  })

  await BrandRole.addMember({
    user: user.id,
    role: role.id
  })

  await sql.update(
    'INSERT INTO users_solo_brands VALUES ($1::uuid, $2::uuid)',
    [user.id, brand.id]
  )
}

async function createAllSoloBrands(users) {
  const pbar = new ProgressBar({}, Presets.shades_classic)

  pbar.start(users.length, 0)

  for (const user of users) {
    await createSoloBrand(user)
    pbar.increment()
  }

  pbar.stop()
}

async function main() {
  const users = await getCrmUsersWithoutBrand()
  await createAllSoloBrands(users)
}

runInContext('create-solo-brands', main)
