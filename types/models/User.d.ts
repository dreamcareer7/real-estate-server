declare interface IUser extends IModel {
    type: String;
    id: String;

    first_name: String;
    last_name: String;
    profile_image_url: String;
    cover_image_url: String;

    email: String;
    phone_number: String;
    email_confirmed: boolean;
    fake_email: boolean;
    is_shadow: boolean;

    agent?: IAgent;
}

declare namespace User {
}
