declare interface IUser extends IModel {
    type: String;
    id: String;

    agent?: IAgent;
}

declare namespace User {
}
