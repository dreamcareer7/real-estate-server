declare interface IUser extends IModel {
    type: string;
    id: UUID;

    first_name: string;
    last_name: string;
    profile_image_url: string;
    cover_image_url: string;

    email: string;
    phone_number: string;
    email_confirmed: boolean;
    fake_email: boolean;
    is_shadow: boolean;

    agent?: IAgent;
}
