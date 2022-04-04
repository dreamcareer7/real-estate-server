CREATE TABLE social_posts (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand uuid NOT NULL REFERENCES brands(id),
    user uuid NOT NULL REFERENCES users(id),
    template_instance uuid NOT NULL REFERENCES templates_instances(id),
    facebook_page uuid REFERENCES facebook_pages(id),
    insta_file uuid REFERENCES files(id),
    due_at timestamp,
    executed_at timestamp,    
    failed_at timestamp,
    failure text,
    caption text NOT NULL,
    published_media_id text,
    post_link text,
    created_at timestamp NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    updated_at timestamp NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    deleted_at timestamp        
)