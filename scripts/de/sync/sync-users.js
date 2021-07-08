const _ = require('lodash')
const pnu = require('google-libphonenumber').PhoneNumberUtil.getInstance()
const db = require('../../../lib/utils/db')
const Context = require('../../../lib/models/Context')

const MAP = `
SELECT
    username,
    id,
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
    de.regions.timezone as timezone
  FROM json_to_recordset($1)
  as input(
    username TEXT,
    id TEXT,
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
    offices jsonb
  )
  JOIN de.regions ON input.region = de.regions.name`

const ORPHANIZE = `
  WITH data AS (
    ${MAP}
  )

  UPDATE users SET
    email = uuid_generate_v4() || '@elimman.cm',
    fake_email = TRUE,
    phone_number = NULL
  FROM de.users
  WHERE de.users.user = public.users.id
  AND de.users.username NOT IN(
    SELECT username FROM data
  )
  RETURNING *
`

const INSERT_USERNAMES = `
WITH data AS (
  ${MAP}
)

INSERT INTO de.users (username, object, updated_at)
SELECT username, ROW_TO_JSON(data), NOW() FROM data
ON CONFLICT (username) DO UPDATE SET
  object = EXCLUDED.object,
  updated_at = NOW()`

const SAVE_USERS = `
WITH data AS (
  ${MAP}
),

saved AS (
  INSERT INTO users (
    first_name,
    last_name,
    email,
    email_confirmed,
    profile_image_url,
    cover_image_url,
    website,
    linkedin,
    facebook,
    youtube,
    instagram,
    twitter,
    user_type,
    timezone,
    agent
  )
  SELECT
    first_name,
    last_name,
    email,
    true,
    profile_image_url,
    cover_image_url,
    'https://elliman.com/' || data.id,
    linkedin,
    facebook,
    youtube,
    instagram,
    twitter,
    user_type,
    timezone,
    (
      SELECT id FROM agents WHERE mls::text = data.mls AND LOWER(mlsid) = LOWER(data.mlsid)
      ORDER BY status = 'Active', matrix_modified_dt
      LIMIT 1
    )
  FROM de.users
  JOIN data ON de.users.username = data.username
  ON CONFLICT (email) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      email = EXCLUDED.email,
      profile_image_url = EXCLUDED.profile_image_url,
      cover_image_url = EXCLUDED.cover_image_url,
      user_type = EXCLUDED.user_type,
      linkedin = EXCLUDED.linkedin,
      facebook = EXCLUDED.facebook,
      youtube = EXCLUDED.youtube,
      instagram = EXCLUDED.instagram,
      twitter = EXCLUDED.twitter,
      website = EXCLUDED.website,
      agent = COALESCE(users.agent, EXCLUDED.agent)

  RETURNING id, email
)

UPDATE de.users
SET "user" = saved.id
FROM data
JOIN saved ON LOWER(data.email) = LOWER(saved.email)
WHERE de.users."user" IS NULL
AND de.users.username = data.username`

const NULLIFY = `
UPDATE users SET
  phone_number = NULL,
  email = uuid_generate_v4() || '@elimman.com',
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
  FROM de.users ORDER BY de.users.object->>'phone_number', updated_at DESC
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
  FROM de.users ORDER BY de.users.object->>'email', updated_at DESC
)
UPDATE users SET
  email = emails.email,
  email_confirmed = TRUE
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

  const mlsid = user.id.split('.').pop()

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

const setRegion = user => {
  return {
    ...user,
    region: user.offices[0].majorRegion
  }
}

const syncUsers = async users => {
  const data = JSON.stringify(users.map(setPhone).map(setSocials).map(setRegion))

  const { rows } = await db.executeSql.promise(ORPHANIZE, [data])

  rows.forEach(r => {
    Context.log('Removing', r.username)
  })

  await db.executeSql.promise(INSERT_USERNAMES, [data])
  await db.executeSql.promise(SAVE_USERS, [data])
  await db.executeSql.promise(NULLIFY)
  await db.executeSql.promise(SET_PHONES)
  await db.executeSql.promise(SET_EMAILS)
  await db.executeSql.promise(CONFIRM)
  await db.executeSql.promise(ENABLE_DAILY)
}


module.exports = syncUsers
