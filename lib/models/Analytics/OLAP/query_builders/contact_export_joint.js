const _ = require('lodash')
const db = require('../../../../utils/db')

const AttributeDef = require('../../../Contact/attribute_def/get')
const Contact = require('../../../Contact/fast_filter')
const Context = require('../../../Context')
const ContactBaseQueryBuilder = require('./contact_base')

function keyByReducer(key) {
  return (s, x) => { s[x[key]] = x; return s }
}

class ContactExportQueryBuilder extends ContactBaseQueryBuilder {
  addFilter(filter) {
    this.filters.push(filter)
  }

  async getMaxIndices(defs, contact_ids) {
    const res = await db.select('contact/export/max_indices', [
      this.brand_id,
      defs.filter(d => d.section !== 'Addresses').map(d => d.id),
      contact_ids
    ])

    return res.reduce((result, row) => {
      const index = result[row.is_partner ? 'partner' : 'primary']

      index[row.attribute_def] = []
      for (let i = 0; i < row.max_index; i++) {
        index[row.attribute_def].push(i + 1)
      }

      return result
    }, {
      primary: {},
      partner: {}
    })
  }

  async headerMapper(row) {
    const def_ids = await AttributeDef.getForBrand(this.brand_id)
    const defs = await AttributeDef.getAll(def_ids)
    const defs_by_id = _.keyBy(defs, 'id')

    const keys = Object.keys(row)

    function header_map(key) {
      if (key === 'id') return 'ID'

      const parts = key.split(':')
      const def = defs_by_id[parts[0]]

      if (def.name === 'email' && parts[2] === '1') {
        return 'E-mail Address'
      }

      if (parts.length === 1) {
        return def.label
      }

      if (parts.length === 2) {
        return parts[1] === 'T' ? 'Partner/Spouse ' + def.label : def.label
      }

      if (def.section === 'Addresses') {
        return parts[2] + ' ' + def.label
      }

      if (parts.length === 3) {
        return (parts[1] === 'T' ? 'Partner/Spouse ' + def.label : def.label) + ' ' + parts[2]
      }

      Context.log('Strange column name', key)
      return def.label
    }

    return keys.map(header_map)
  }

  /**
   * @returns {Promise<any[]>}
   */
  async facts(options = {}) {
    await this.authorize()

    const def_ids = await AttributeDef.getForBrand(this.brand_id)
    const defs = await AttributeDef.getAll(def_ids)

    const singular = defs.filter(d => d.singular)
    const non_singular_with_label = defs.filter(d => !d.singular && d.has_label && d.section !== 'Addresses')
    const non_singular_without_label = defs.filter(d => !d.singular && !d.has_label)
    const addresses = defs.filter(d => d.section === 'Addresses')

    let ids = null

    if ((Array.isArray(this.filters) && this.filters.length > 0) || Object.keys(options).length > 0) {
      const res = await Contact.fastFilter(
        this.brand_id,
        this.user_id,
        this.filters,
        options,
      )
      ids = Array.from(res.ids)
    }

    const max_indices = await this.getMaxIndices(non_singular_with_label, ids)

    const ctsql = `
      WITH attrs AS (
        SELECT
          ca.*,
          (CASE 
            WHEN ca.date <= '1801-01-01'::date THEN
              to_char(ca.date, 'Mon DD')
            WHEN ca.date > '1801-01-01'::date THEN
              to_char(ca.date, 'Mon DD, YYYY')
            ELSE
              NULL
          END) AS "date_formatted"
        FROM
          contacts c
          JOIN contacts_attributes ca
            ON ca.contact = c.id
        WHERE
          c.deleted_at IS NULL
          ${ids ? `AND c.id = ANY('{${ids.join(', ')}}'::uuid[])` : ''}
          AND c.brand = '${this.brand_id}'::uuid
          AND ca.deleted_at IS NULL
          AND ca.attribute_def = ANY('{${def_ids}}'::uuid[])
      ),
      summaries AS (
        (
          SELECT
            contact AS id,
            attribute_def::text || (CASE WHEN is_partner IS TRUE THEN ':T' ELSE ':F' END) AS attribute_def,
            COALESCE(
              text,
              date_formatted
            ) AS "value"
          FROM
            attrs
          WHERE
            attribute_def = ANY('{${singular.map(d => d.id)}}'::uuid[])
        )
        UNION ALL
        (
          SELECT
            contact AS id,
            attribute_def::text,
            array_agg(text ORDER BY is_primary desc, updated_at desc)::text AS "value"
          FROM
            attrs
          WHERE
            attribute_def = ANY('{${non_singular_without_label.map(d => d.id)}}'::uuid[])
          GROUP BY
            contact,
            attribute_def
        )
        UNION ALL
        (
          SELECT
            contact AS id,
            attribute_def::text || (CASE WHEN is_partner IS TRUE THEN ':T:' ELSE ':F:' END) || (row_number() OVER (w)),
            text AS "value"
          FROM
            attrs
          WHERE
            attribute_def = ANY('{${non_singular_with_label.map(d => d.id)}}'::uuid[])
          WINDOW w AS (
            PARTITION BY
              contact, attribute_def, is_partner
          )
          ORDER BY
            contact,
            attribute_def,
            is_partner,
            is_primary DESC
        )
        UNION ALL
        (
          SELECT
            contact AS id,
            attribute_def::text || ':F:' || attrs.label,
            text AS "value"
          FROM
            attrs
          WHERE
            attribute_def = ANY('{${addresses.map(d => d.id)}}'::uuid[])
          ORDER BY
            contact,
            attribute_def,
            index
        )
      )
      SELECT
        id,
        attribute_def,
        "value"
      FROM
        summaries
      ORDER BY
        id,
        attribute_def
    `

    function type_map(def) {
      const map = {
        'date': 'text',
        'text': 'text',
        'number': 'double precision'
      }

      return map[def.data_type] + (def.singular || def.has_label ? '' : '[]')
    }

    function def_name(def, is_partner) {
      const index = max_indices[is_partner ? 'partner' : 'primary']

      if (def.singular) return [`${def.id}:${is_partner ? 'T' : 'F'}`]
      if (!def.has_label) return [def.id]
      if (def.section === 'Addresses') return ['Home', 'Work', 'Other'].map(l => `${def.id}:F:${l}`)
      if (Array.isArray(index[def.id])) return index[def.id].map(i => `${def.id}:${is_partner ? 'T' : 'F'}:${i}`)

      Context.log('Unknown def', def.name)
      return []
    }

    function name_map(is_partner) {
      return def => def_name(def, is_partner).map(name => `('${name}')`)
    }

    function column_map(is_partner) {
      return def => {
        return def_name(def, is_partner)
          .map(name => `"${name}" ${type_map(def)}`)
      }
    }

    function fields(defs) {
      const global_defs = defs.filter(d => d.global).reduce(keyByReducer('name'), {})
      const primary = _(global_defs).pick([
        'title',
        'first_name',
        'middle_name',
        'last_name',
        'marketing_name',
        'source',
        'company',
        'job_title',
        'birthday',
        'email',
        'phone_number',
        'website',
        'tag'
      ])
        .values()
        .flatMap(d => def_name(d, false))
        .map(f => `"${f}"`)
        .value()

      const partner = _(global_defs).pick([
        'title',
        'first_name',
        'middle_name',
        'last_name',
        'company',
        'job_title',
        'birthday',
        'email',
        'phone_number',
        'website'
      ])
        .values()
        .flatMap(d => def_name(d, true))
        .map(f => `"${f}"`)
        .value()

      const address = ['Home', 'Work', 'Other'].map(label => _(global_defs).pick([
        'state',
        'city',
        'street_prefix',
        'street_name',
        'street_suffix',
        'street_number',
        'unit_number',
        'postal_code'
      ])
        .values()
        .flatMap(d => `${d.id}:F:${label}`)
        .map(f => `"${f}"`)
        .value()
      ).reduce((s, a) => s.concat(a), [])

      const social = _(global_defs).pick([
        'linkedin',
        'facebook',
        'instagram'
      ])
        .values()
        .flatMap(d => def_name(d, false))
        .map(f => `"${f}"`)
        .value()

      return primary.concat(partner).concat(social).concat(address)
    }

    const ct_values = _.flatMap(defs, name_map(false))
      .concat(singular.map(name_map(true)))
      .concat(non_singular_with_label.map(name_map(true)))
      .filter(x => x.length > 0)
      .join(', ')

    const ct_columns = _.flatMap(defs, column_map(false))
      .concat(singular.map(column_map(true)))
      .concat(non_singular_with_label.map(column_map(true)))
      .filter(x => x.length > 0)
      .join(', ')

    const sql = `
      SELECT
        ${fields(defs)}
      FROM
        crosstab($$${ctsql}$$, $$
          VALUES
            ${ct_values}
        $$) AS ct(
          id uuid,
          ${ct_columns}
        )
    `
    const res = await db.executeSql.promise(sql, [])
    return res.rows
  }
}

module.exports = ContactExportQueryBuilder
