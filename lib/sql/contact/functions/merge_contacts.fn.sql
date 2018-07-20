CREATE OR REPLACE FUNCTION merge_contacts(parent uuid, children uuid[]) RETURNS void
LANGUAGE SQL
AS $$
  /* Take care of non-singular attributes first */
  WITH max_indices AS (
    SELECT
      contact,
      (contact = parent) AS is_parent,
      MAX(index) AS max_index
    FROM
      contacts_attributes
    WHERE
      contact = ANY(array_prepend(parent, children))
      AND deleted_at IS NULL
    GROUP BY
      contact
  ),
  index_space AS (
    SELECT
      contact,
      SUM(max_index) OVER (w) - COALESCE(LAG(max_index) OVER (w), max_index) + row_number() OVER (w) - 1 AS index_offset
    FROM
      max_indices
    WINDOW w AS (ORDER BY is_parent DESC, contact)
  ),
  attrs AS (
    SELECT
      ca.id,
      ca.contact,
      isp.index_offset,
      ca.text,
      ca.date,
      ca.number,
      ca.index,
      ca.label,
      ca.attribute_def,
      cad.data_type,
      (ca.contact = parent) AS is_parent_attr
    FROM
      contacts_attributes AS ca
      JOIN contacts_attribute_defs AS cad
        ON ca.attribute_def = cad.id
      JOIN index_space AS isp
        USING (contact)
    WHERE
      ca.deleted_at IS NULL
      AND cad.deleted_at IS NULL
      AND cad.singular IS FALSE
      AND ca.contact = ANY(array_prepend(parent, children))
  ),
  attrs_to_keep AS (
    (
      SELECT DISTINCT ON (attribute_def, text, index, label)
        id, index_offset
      FROM
        attrs
      WHERE
        data_type = 'text'
        AND section <> 'Addresses'
      ORDER BY
        attribute_def, text, index, label, is_parent_attr desc
    )
    UNION ALL
    (
      SELECT
        id, index_offset
      FROM
        attrs
      WHERE
        data_type = 'text'
        AND section = 'Addresses'
    )
    UNION ALL
    (
      SELECT DISTINCT ON (attribute_def, date, index, label)
        id, index_offset
      FROM
        attrs
      WHERE
        data_type = 'date'
      ORDER BY
        attribute_def, date, index, label, is_parent_attr desc
    )
    UNION ALL
    (
      SELECT DISTINCT ON (attribute_def, number, index, label)
        id, index_offset
      FROM
        attrs
      WHERE
        data_type = 'number'
      ORDER BY
        attribute_def, number, index, label, is_parent_attr desc
    )
  )
  UPDATE
    contacts_attributes AS ca
  SET
    contact = parent,
    index = index + atk.index_offset
  FROM
    attrs_to_keep AS atk
  WHERE
    ca.id = atk.id;

  /* On to the singular attributes */
  WITH attrs AS (
    SELECT
      ca.id,
      ca.attribute_def,
      ca.updated_at,
      (ca.contact = parent) AS is_parent_attr
    FROM
      contacts_attributes AS ca
      JOIN contacts_attribute_defs AS cad
        ON ca.attribute_def = cad.id
    WHERE
      ca.deleted_at IS NULL
      AND cad.deleted_at IS NULL
      AND cad.singular IS TRUE
      AND ca.contact = ANY(array_prepend(parent, children))
  ),
  attrs_to_keep AS (
    SELECT DISTINCT ON (attribute_def)
      id
    FROM
      attrs
    ORDER BY
      attribute_def, is_parent_attr desc, updated_at desc
  )
  UPDATE
    contacts_attributes AS ca
  SET
    contact = parent
  FROM
    attrs_to_keep AS atk
  WHERE
    ca.id = atk.id;

  /* Update references to children */
  UPDATE
    crm_associations
  SET
    contact = parent
  WHERE
    contact = ANY(children);

  /* Delete child contacts */
  UPDATE
    contacts
  SET
    deleted_at = NOW()
  WHERE
    id = ANY(children);
$$