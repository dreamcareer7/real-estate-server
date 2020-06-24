const db = require('../lib/utils/db')

const migrations = [
  'ALTER TYPE template_type ADD VALUE \'FathersDay\'         IF NOT EXISTS',
  'ALTER TYPE template_type ADD VALUE \'MothersDay\'         IF NOT EXISTS',
  'ALTER TYPE template_type ADD VALUE \'MemorialDay\'        IF NOT EXISTS',
  'ALTER TYPE template_type ADD VALUE \'Passover\'           IF NOT EXISTS',
  'ALTER TYPE template_type ADD VALUE \'ChineseNewYear\'     IF NOT EXISTS',
  'ALTER TYPE template_type ADD VALUE \'LaborDay\'           IF NOT EXISTS',
  'ALTER TYPE template_type ADD VALUE \'Hannukkah\'          IF NOT EXISTS',
  'ALTER TYPE template_type ADD VALUE \'FourthOfJuly\'       IF NOT EXISTS',
  'ALTER TYPE template_type ADD VALUE \'VeteransDay\'        IF NOT EXISTS',
  'ALTER TYPE template_type ADD VALUE \'Thanksgiving\'       IF NOT EXISTS',
  'ALTER TYPE template_type ADD VALUE \'Halloween\'          IF NOT EXISTS',
  'ALTER TYPE template_type ADD VALUE \'MLKDay\'             IF NOT EXISTS',
  'ALTER TYPE template_type ADD VALUE \'IndependenceDay\'    IF NOT EXISTS',
  'ALTER TYPE template_type ADD VALUE \'Diwaly\'             IF NOT EXISTS',
  'ALTER TYPE template_type ADD VALUE \'Rosh Hashanah\'      IF NOT EXISTS',
  'ALTER TYPE template_type ADD VALUE \'Kwanzaa\'            IF NOT EXISTS',
  'ALTER TYPE template_type ADD VALUE \'WeddingAnniversary\' IF NOT EXISTS',
  'ALTER TYPE template_type ADD VALUE \'HomeAnniversary\'    IF NOT EXISTS'
]


const run = async () => {
  const { conn } = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
