CREATE TRIGGER update_microsoft_threads_on_new_messages
AFTER INSERT ON microsoft_messages
REFERENCING NEW TABLE AS new_messages
FOR EACH STATEMENT
EXECUTE update_microsoft_threads_on_new_messages()
