declare namespace ObjectUtil {
    function cleanPhoneNumber(number: String): String;
    function makeRegexps(strings: String[]): String[];
    function trimLeadingZeros(value: String): String;
    function obfuscateString(string: String): String;
    function formatPhoneNumberForDialing(phone_number: String): String | null;
    function getCurrentUser(): IUser;
}