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
}) => {
  const id = await db.insert('distribution_list/insert', [
    email,
    first_name,
    last_name,
    title,
    city,
    state,
    postal_code,
    country,
    phone,
  ])
  return id
}

module.exports = {
  create,
}
