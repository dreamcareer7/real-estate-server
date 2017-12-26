const codes = {
  SellerLawyer: 'S',
  SellerReferral: 'S',
  BuyerLawyer: 'L',
  BuyerReferral: 'L'
}

const businessFormatter = ({deal, role, personnel}) => {
  const EndCode = codes[role.role]

  const a = {
    rechat_id: role.id, // We need this a bit further
    Id: role.brokerwolf_id,
    EndCode,
    FirstName: role.legal_first_name,
    LastName: role.legal_last_name,
    ContactTypeId: role.brokerwolf_contact_type,
    CompanyName: role.company_title
  }

  if (role.email)
    a.EmailAddresses = [
      {
        Address: role.email,
        Primary: true,
        TypeCode: 'W'
      }
    ]

  if (role.phone_number)
    a.PhoneNumbers = [
      {
        Number: role.phone_number,
        Primary: true,
        TypeCode: 'B'
      }
    ]

  personnel.BusinessContacts.push(a)
}

module.exports = businessFormatter