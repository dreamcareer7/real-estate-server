const get = async id => {
  const domains = await getAll([id])

  if (domains.length < 1)
      return cb(Error.ResourceNotFound(`Cannot find domain ${id}`))

  return domains[0]
}

const getAll = async ids => {
  return db.query.select('godaddy/domain/get', [ids])
}
