const db = require('../../lib/utils/db')

/**
 * @param {string} typeName
 */
async function generateEnum(typeName) {
  const { conn, done } = await db.conn.promise()

  try {
    const { rows: values } = await db.executeSql.promise(`
      SELECT * FROM unnest(enum_range(NULL::${typeName})) AS t(name)
    `, [], conn)
  
    console.log(`export type ${typeName} =\n` + values.map(({ name }) => `  | '${name}'`).join('\n'))
  } catch (ex) {
    console.error(ex)
  } finally {
    done()
  }
}

async function main() {
  await generateEnum(process.argv[2])
}

main().catch(ex => console.error(ex)).finally(() => process.exit())
