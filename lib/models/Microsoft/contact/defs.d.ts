export namespace Microsoft {
  /**
   * The name and email address of a contact or message recipient.
   * @see {@link https://docs.microsoft.com/en-us/graph/api/resources/emailaddress?view=graph-rest-1.0}
   */
  export interface EmailAddress {
    /** The email address of the person or entity. */
    address: string;

    /** The display name of the person or entity. */
    name: string;
  }

  /** 
   * Represents the street address of a resource such as a contact or event.
   * @see {@link https://docs.microsoft.com/en-us/graph/api/resources/physicaladdress?view=graph-rest-1.0}
   */
  export interface PhysicalAddress {
    /** The city. */
    city: string;
    
    /**
     * The country or region. It's a free-format string value, for example,
     * "United States".
     */
    countryOrRegion: string;
    
    /**	The postal code. */
    postalCode: string;
    
    /** The state. */
    state: string;
    
    /**	The street. */
    street: string;
  }

  /**
   * A contact is an item in Outlook where you can organize and save information
   * about the people and organizations you communicate with. Contacts are
   * contained in contact folders.
   * @see {@link https://docs.microsoft.com/en-us/graph/api/resources/contact?view=graph-rest-1.0}
   */
  export interface Contact {
    /** The name of the contact's assistant. */
    assistantName?: string;

    /**
     * The contact's birthday. The Timestamp type represents date and time
     * information using ISO 8601 format and is always in UTC time. For example,
     * midnight UTC on Jan 1, 2014 would look like this: '2014-01-01T00:00:00Z'
     */
    birthday?: string;

    /** The contact's business address. */
    businessAddress?: PhysicalAddress;

    /** The business home page of the contact. */
    businessHomePage?: string;

    /** The contact's business phone numbers. */
    businessPhones?: string[];

    /** The categories associated with the contact. */
    categories?: string[];

    /**
     * Identifies the version of the contact. Every time the contact is changed,
     * ChangeKey changes as well. This allows Exchange to apply changes to the
     * correct version of the object.
     */
    changeKey?: string;

    /** The names of the contact's children. */
    children?: string[];

    /** The name of the contact's company. */
    companyName?: string;

    /**
     * The time the contact was created. The Timestamp type represents date and
     * time information using ISO 8601 format and is always in UTC time. For
     * example, midnight UTC on Jan 1, 2014 would look like this:
     * '2014-01-01T00:00:00Z'
     */
    createdDateTime?: string;

    /** The contact's department. */
    department?: string;

    /**
     * The contact's display name. You can specify the display name in a create
     * or update operation. Note that later updates to other properties may
     * cause an automatically generated value to overwrite the displayName value
     * you have specified. To preserve a pre-existing value, always include it
     * as displayName in an update operation.
     */
    displayName?: string;

    /** The contact's email addresses. */
    emailAddresses?: EmailAddress[];

    /** The name the contact is filed under. */
    fileAs?: string;

    /** The contact's generation. */
    generation?: string;

    /** The contact's given name. */
    givenName?: string;

    /** The contact's home address. */
    homeAddress?: PhysicalAddress;

    /** The contact's home phone numbers. */
    homePhones?: string[];

    /** The contact's unique identifier. Read-only. */
    id?: string;

    /** The contact's instant messaging (IM) addresses. */
    imAddresses?: string[];

    /** The contact's initials. */
    initials?: string;

    /** The contact’s job title. */
    jobTitle?: string;

    /**
     * The time the contact was modified. The Timestamp type represents date and
     * time information using ISO 8601 format and is always in UTC time. For
     * example, midnight UTC on Jan 1, 2014 would look like this:
     * '2014-01-01T00:00:00Z'
     */
    lastModifiedDateTime?: string;

    /** The name of the contact's manager. */
    manager?: string;

    /** The contact's middle name. */
    middleName?: string;

    /** The contact's mobile phone number. */
    mobilePhone?: string;

    /** The contact's nickname. */
    nickName?: string;

    /** The location of the contact's office. */
    officeLocation?: string;

    /** Other addresses for the contact. */
    otherAddress?: PhysicalAddress;

    /** The ID of the contact's parent folder. */
    parentFolderId?: string;

    /** The user's notes about the contact. */
    personalNotes?: string;

    /** The contact's profession. */
    profession?: string;

    /** The name of the contact's spouse/partner. */
    spouseName?: string;

    /** The contact's surname. */
    surname?: string;

    /** The contact's title. */
    title?: string;

    /** The phonetic Japanese company name of the contact. */
    yomiCompanyName?: string;

    /** The phonetic Japanese given name (first name) of the contact. */
    yomiGivenName?: string;

    /** The phonetic Japanese surname (last name) of the contact. */
    yomiSurname?: string;
  }
}
