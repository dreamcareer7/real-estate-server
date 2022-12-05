const db = require('../../utils/db')

const create = async ({
  email,
  first_name,
  last_name,
  title,
  city,
  state,
  postal_code,
  country,
  phone,
  mls,
}) => {
  const id = await db.insert('distribution_lists_contacts/insert', [
    email,
    first_name,
    last_name,
    title,
    city,
    state,
    postal_code,
    country,
    phone,
    mls
  ])
  console.log(id)
  return id
}

module.exports = {
  create,
}
