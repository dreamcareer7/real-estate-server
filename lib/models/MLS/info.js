const db = require('../../utils/db')
const Orm = {
  ...require('../Orm/registry'),
  ...require('../Orm/context'),
}

const getAll = async mls => {
  const rows = await db.select('mls/get', [mls])
  console.log(rows, '-------------')
  return rows
}


Orm.register('mls_info', 'MlsInfo', {
  getAll,
})