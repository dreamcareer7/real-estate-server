const _ = require('lodash')
const pnu = require('google-libphonenumber').PhoneNumberUtil.getInstance()
const db = require('../../../lib/utils/db')
const Context = require('../../../lib/models/Context')

const MAP = `
SELECT
    key,
    id,
    username,
    mlsid,
    "firstName" as first_name,
    "lastName" as last_name,
    LOWER(email) as email,
    phone_number,
    "imageURLRound" as profile_image_url,
    "imageURL" as cover_image_url,
    id as mls_number,
    "mlsSystem" as mls,
    user_type,
    linkedin,
    facebook,
    youtube,
    instagram,
    twitter,
    region,
    offices,
    de.regions.timezone as timezone,
    designation,
    "d365AgentId",
    mlses
  FROM json_to_recordset($1)
  as input(
    key TEXT,
    id TEXT,
    username TEXT,
    mlsid TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "imageURL" TEXT,
    "imageURLRound" TEXT,
    "mlsSystem" TEXT,
    phone_number TEXT,
    user_type user_type,
    linkedin TEXT,
    facebook TEXT,
    youtube TEXT,
    instagram TEXT,
    twitter TEXT,
    region TEXT,
    designation TEXT,
    "d365AgentId" TEXT,
    offices jsonb,
    mlses jsonb
  )
  JOIN de.regions ON input.region = de.regions.name`

const ORPHANIZE = `
  WITH data AS (
    ${MAP}
  )

  UPDATE de.users SET deleted_at = NOW()
  WHERE deleted_at IS NULL -- Dont redelete?
  AND key NOT IN (
    SELECT key FROM data
  )
`

const INSERT_KEYS = `
WITH data AS (
  ${MAP}
)

INSERT INTO de.users (key, object, updated_at)
SELECT key, ROW_TO_JSON(data), NOW() FROM data
ON CONFLICT (key) DO UPDATE SET
  object = EXCLUDED.object,
  updated_at = NOW(),
  deleted_at = NULL -- Undelete is they have appeared again
RETURNING *`

const INSERT_USERS = `
WITH saved AS (
  INSERT INTO users (
    email,
    user_type
  )
  SELECT
    DISTINCT ON(de.users.object->>'email')
    de.users.object->>'email',
    (de.users.object->>'user_type')::user_type
  FROM de.users WHERE "user" IS NULL
  ON CONFLICT(email) DO UPDATE SET updated_at = NOW()
  RETURNING id, email
)

UPDATE de.users
SET "user" = saved.id
FROM saved
WHERE de.users."user" IS NULL
AND LOWER(de.users.object->>'email') = LOWER(saved.email)
RETURNING id`

const UPDATE_USERS = `
WITH users_with_no_room AS (
    SELECT public.users.id FROM public.users
    JOIN de.users ON de.users.user = public.users.id
    LEFT JOIN rooms ON rooms.owner = public.users.id AND rooms.room_type = 'Personal'
    WHERE public.users.personal_room IS NULL AND rooms.id IS NULL
),

inserted_rooms AS (
    INSERT INTO rooms(room_type, owner)
    SELECT 'Personal', id FROM users_with_no_room
    RETURNING *
),

rooms_users AS (
    INSERT INTO rooms_users(room, "user")
    SELECT id, owner FROM inserted_rooms
)

UPDATE public.users SET 
    first_name = de.users.object->>'first_name',
    last_name = de.users.object->>'last_name',
    profile_image_url = de.users.object->>'profile_image_url',
    cover_image_url = de.users.object->>'cover_image_url',
    website = ('https://elliman.com/' || (de.users.object->>'username')),
    linkedin = de.users.object->>'linkedin',
    facebook = de.users.object->>'facebook',
    youtube = de.users.object->>'youtube',
    instagram = de.users.object->>'instagram',
    twitter = de.users.object->>'twitter',
    user_type = (de.users.object->>'user_type')::user_type,
    timezone = de.users.object->>'timezone',
    designation = de.users.object->>'designation',
    personal_room = COALESCE(personal_room, (SELECT id FROM rooms WHERE owner = public.users.id AND room_type = 'Personal'))
  FROM de.users
  WHERE public.users.id = de.users.user
  RETURNING id
`

const NULLIFY = `
UPDATE users SET
  phone_number = NULL,
  email = de.users.key || '-deleted-account@elliman.com',
  fake_email = true
FROM de.users
WHERE public.users.id = de.users.user
RETURNING *`

const SET_PHONES = `
WITH phones AS (
  SELECT
    DISTINCT ON(de.users.object->>'phone_number')
    de.users.object->>'phone_number' as phone_number,
    "user"
  FROM de.users 
  WHERE deleted_at IS NULL
  ORDER BY de.users.object->>'phone_number', updated_at DESC
)
UPDATE users SET
  phone_number = phones.phone_number,
  phone_confirmed = TRUE
FROM phones
WHERE users.id = phones.user AND (
  SELECT count(*) FROM users WHERE phone_number = phones.phone_number
) < 1
RETURNING *`

const SET_EMAILS = `
WITH emails AS (
  SELECT
    DISTINCT ON(de.users.object->>'email')
    de.users.object->>'email' as email,
    "user"
  FROM de.users 
  WHERE deleted_at IS NULL
  ORDER BY de.users.object->>'email', updated_at DESC

)
UPDATE users SET
  email = emails.email,
  email_confirmed = TRUE,
  fake_email = FALSE
FROM emails
WHERE users.id = emails.user AND (
  SELECT count(*) FROM users WHERE LOWER(email) = LOWER(emails.email)
) < 1
RETURNING *`

const CONFIRM = `
UPDATE users SET
  phone_confirmed = (phone_number IS NOT NULL),
  email_confirmed = true
FROM de.users
WHERE public.users.id = de.users.user`

const ENABLE_DAILY = `UPDATE public.users SET daily_enabled = TRUE
  FROM de.users
  JOIN public.users pu ON de.users.user = pu.id
  WHERE pu.user_type = 'Agent'
  AND pu.last_seen_at IS NOT NULL
  AND public.users.id = pu.id`

const SET_AGENTS = `INSERT INTO users_agents ("user", agent)
  WITH mlses AS (
    SELECT
      de.users.user,
      jsonb_array_elements(de.users.object->'mlses') as mls FROM de.users
  )
  SELECT mlses.user, agents.id FROM mlses
  JOIN agents ON mlses.mls->>'mls'::text = agents.mls::text AND LOWER(mlses.mls->>'id') = LOWER(agents.mlsid)
  ON CONFLICT DO NOTHING`

const setPhone = user => {
  const { number } = _.find(user.phoneNumbers, { type: 'Mobile' }) || _.find(user.phoneNumbers, { type: 'Direct' }) || {}

  let phone_number

  if (number) {
    try {
      const parsed = pnu.parse(number, 'US')
      phone_number = pnu.formatNumberForMobileDialing(parsed)
    } catch(e) {
      Context.log('Invalid phone', number, 'for', user.email)
    }
  }

  const mlsid = (user.rbnyAgentId ?? user.id).split('.').pop()

  if (user.designation === 'LSA')
    user.designation = 'Licensed Real Estate Salesperson'

  if (user.designation === 'LBA')
    user.designation = 'Licensed Associate Real Estate Broker'

  if (user.designation === 'BA')
    user.designation = 'Broker Associate'

  if (user.designation === 'RA')
    user.designation = 'Realtor Associate'

  if (user.designation === 'None')
    user.designation = null

  return {
    ...user,
    mlsid,
    phone_number: phone_number?.length > 0 ? phone_number : null,
    user_type: user.isAgent ? 'Agent' : 'Client'
  }
}

const setSocials = user => {
  const { socialMediaSites } = user
  if (!socialMediaSites)
    return user

  const linkedin = _.find(socialMediaSites, {type: 'LinkedIn'})?.url
  const facebook = _.find(socialMediaSites, {type: 'Facebook'})?.url
  const youtube = _.find(socialMediaSites, {type: 'Youtube'})?.url
  const instagram = _.find(socialMediaSites, {type: 'Instagram'})?.url
  const twitter = _.find(socialMediaSites, {type: 'Twitter'})?.url

  return {
    ...user,
    linkedin,
    facebook,
    youtube,
    instagram,
    twitter
  }
}

const syncUsers = async users => {
  const data = JSON.stringify(
    users
      .map(setPhone)
      .map(setSocials)
  )

  const { rows } = await db.executeSql.promise(ORPHANIZE, [data])

  rows.forEach(r => {
    Context.log('Removing', r.key)
  })

  await db.executeSql.promise(INSERT_KEYS, [data])

  const inserts = await db.executeSql.promise(INSERT_USERS)
  Context.log('Inserted', inserts.rows.length, 'new users')

  const updates = await db.executeSql.promise(UPDATE_USERS)
  Context.log('Updated', updates.rows.length, 'users')

  await db.executeSql.promise(NULLIFY)
  await db.executeSql.promise(SET_PHONES)
  await db.executeSql.promise(SET_EMAILS)
  await db.executeSql.promise(SET_AGENTS)
  await db.executeSql.promise(CONFIRM)
  await db.executeSql.promise(ENABLE_DAILY)
}


module.exports = syncUsers
