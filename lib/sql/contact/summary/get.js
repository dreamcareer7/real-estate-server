const squel = require('../../../utils/squel_extensions')

/**
 * Returns a query that serves as the first argument to crosstab
 * @param {UUID[]} contact_ids 
 */
function crosstab_query(contact_ids) {
  return squel.select()
    .withValues('contact_ids', contact_ids.map(id => ({ id })))
    .distinct('contacts.id', 'contacts_attributes.attribute_def')
    .field('contacts.id')
    .field('contacts_attribute_defs.name')
    .field(`COALESCE(
      contacts_attributes.text,
      contacts_attributes.number::text,
      contacts_attributes.date::text
    )`, 'value')
    .from('contacts')
    .join('contacts_attributes', undefined, 'contacts_attributes.contact = contacts.id')
    .join('contacts_attribute_defs', undefined, 'contacts_attributes.attribute_def = contacts_attribute_defs.id')
    .join('contact_ids', undefined, 'contacts.id = contact_ids.id::uuid')
    .where('contacts_attributes.deleted_at IS NULL')
    .where('contacts.deleted_at IS NULL')
    .where('global IS True')
    .where('singular IS TRUE OR name = ? OR name = ? OR name = ?', 'email', 'phone_number', 'company')
    .order('contacts.id')
    .order('contacts_attributes.attribute_def')
    .order('contacts_attributes.is_primary', false)
    .order('contacts_attributes.updated_at', false)
    .toString()
}

module.exports = function(contact_ids) {
  return `SELECT
    contacts_summaries.*,
    extract(epoch from contacts_summaries.birthday) AS birthday,
    extract(epoch from contacts_summaries.last_modified_on_source) AS last_modified_on_source,
    'contact_summary' AS type
  FROM
    crosstab($$${crosstab_query(contact_ids)}$$, $$
    VALUES
      ('title'),
      ('first_name'),
      ('middle_name'),
      ('last_name'),
      ('nickname'),
      ('email'),
      ('phone_number'),
      ('company'),
      ('birthday'),
      ('profile_image_url'),
      ('cover_image_url'),
      ('job_title'),
      ('source_type'),
      ('source_id'),
      ('last_modified_on_source'),
      ('stage'),
      ('source')
  $$) AS contacts_summaries(
    id uuid,
    title text,
    first_name text,
    middle_name text,
    last_name text,
    nickname text,
    email text,
    phone_number text,
    company text,
    birthday timestamptz,
    profile_image_url text,
    cover_image_url text,
    job_title text,
    source_type text,
    source_id text,
    last_modified_on_source timestamptz,
    stage text,
    source text
  )`
}
/*
SELECT DISTINCT ON (contacts.id, contacts_attributes.attribute_def)
  contacts.id,
  contacts_attribute_defs.name,
  COALESCE(
    contacts_attributes.text,
    contacts_attributes.number::text,
    contacts_attributes.date::text
  ) AS "value"
FROM
  contacts
  JOIN contacts_attributes ON contacts_attributes.contact = contacts.id
  JOIN contacts_attribute_defs ON contacts_attributes.attribute_def = contacts_attribute_defs.id
WHERE
  contacts_attributes.deleted_at IS NULL
  AND contacts.deleted_at IS NULL
  AND global IS True
  AND (singular IS TRUE OR name = 'email' OR name = 'phone_number' OR name = 'company')
ORDER BY
  contacts.id,
  contacts_attributes.attribute_def,
  contacts_attributes.updated_at desc
*/