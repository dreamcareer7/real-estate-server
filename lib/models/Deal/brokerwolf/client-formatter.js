const clientFormatter = ({deal, role, personnel}) => {
  const a = {
    rechat_id: role.id, // We need this a bit further
    Id: role.brokerwolf_id,
//     RowVersion: role.brokerwolf_row_version,
    FirstName: role.user.first_name,
    LastName: role.user.last_name,
    ContactTypeId: role.brokerwolf_contact_type
  }

  if (role.user.email)
    a.EmailAddresses = [
      {
        Address: role.user.email,
        Primary: true,
        TypeCode: 'B'
      }
    ]

  if (role.user.phone_number)
    a.PhoneNumbers = [
      {
        Number: role.user.phone_number,
        Primary: true,
        TypeCode: 'B'
      }
    ]

  personnel.ClientContacts.push(a)
}

module.exports = clientFormatter