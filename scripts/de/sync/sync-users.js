const _ = require('lodash')
const pnu = require('google-libphonenumber').PhoneNumberUtil.getInstance()
const db = require('../../../lib/utils/db')

const MAP = `
SELECT
    username,
    id as mlsid,
    "firstName" as first_name,
    "lastName" as last_name,
    LOWER(email) as email,
    phone_number,
    "imageURL" as profile_image_url,
    id as mls_number,
    "mlsSystem" as mls,
    user_type,
    linkedin,
    facebook,
    youtube,
    instagram,
    twitter,
    offices
  FROM json_to_recordset($1)
  as input(
    username TEXT,
    id TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "imageURL" TEXT,
    "mlsSystem" TEXT,
    phone_number TEXT,
    user_type user_type,
    linkedin TEXT,
    facebook TEXT,
    youtube TEXT,
    instagram TEXT,
    twitter TEXT,
    offices jsonb
  )`

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
    website,
    linkedin,
    facebook,
    youtube,
    instagram,
    twitter,
    user_type,
    agent
  )
  SELECT
    first_name,
    last_name,
    email,
    true,
    profile_image_url,
    'https://elliman.com/' || mlsid,
    linkedin,
    facebook,
    youtube,
    instagram,
    twitter,
    user_type,
    (
      SELECT id FROM agents WHERE mls::text = data.mls AND mlsid = data.mlsid
    )
  FROM de.users
  JOIN data ON de.users.username = data.username
  ON CONFLICT (email) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      email = EXCLUDED.email,
      profile_image_url = EXCLUDED.profile_image_url,
      user_type = EXCLUDED.user_type,
      linkedin = EXCLUDED.linkedin,
      facebook = EXCLUDED.facebook,
      youtube = EXCLUDED.youtube,
      instagram = EXCLUDED.instagram,
      twitter = EXCLUDED.twitter

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
WHERE users.id = phones.user
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
WHERE users.id = emails.user
RETURNING *`

const setPhone = user => {
  const { number } = _.find(user.phoneNumbers, { type: 'Mobile' }) || {}

  let phone_number

  if (number) {
    const parsed = pnu.parse(number, 'US')
    phone_number = pnu.formatNumberForMobileDialing(parsed)
  }

  return {
    ...user,
    phone_number,
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
  const data = JSON.stringify(users.map(setPhone).map(setSocials))

  await db.executeSql.promise(INSERT_USERNAMES, [data])
  await db.executeSql.promise(SAVE_USERS, [data])
  await db.executeSql.promise(NULLIFY)
  await db.executeSql.promise(SET_PHONES)
  await db.executeSql.promise(SET_EMAILS)
}


module.exports = syncUsers
