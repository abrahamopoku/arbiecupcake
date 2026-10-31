-- Schema reference generated from PostgreSQL catalog metadata.

-- Review before applying to a new Supabase project. Not executed.

CREATE SCHEMA IF NOT EXISTS public;

CREATE TABLE public."tiers" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "price" numeric DEFAULT 0,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE public."function_logs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "function_name" text NOT NULL,
  "timestamp" timestamp with time zone DEFAULT now(),
  "level" text NOT NULL,
  "message" text,
  "stack_trace" text,
  "metadata" jsonb
);

CREATE TABLE public."hero_banners" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "image_url" text,
  "link_url" text,
  "is_active" boolean DEFAULT true,
  "display_order" integer DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE public."products" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "price" numeric(10,2) NOT NULL,
  "category" text NOT NULL,
  "image_url" text,
  "is_available" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "is_trending" boolean DEFAULT false,
  "original_price" numeric,
  "is_package" boolean DEFAULT false,
  "package_items" text,
  "additional_images" text[],
  "customizable" boolean DEFAULT false,
  "base_price" numeric
);

CREATE TABLE public."orders" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "customer_name" text NOT NULL,
  "customer_email" text NOT NULL,
  "customer_phone" text NOT NULL,
  "delivery_address" text NOT NULL,
  "total_amount" numeric(10,2) NOT NULL,
  "payment_status" text DEFAULT 'pending'::text,
  "payment_reference" text,
  "order_status" text DEFAULT 'pending'::text,
  "order_items" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "order_number" text,
  "assigned_to" text,
  "worker_instructions" text,
  "invoice_sent" boolean DEFAULT false,
  "priority" text,
  "deadline_target" timestamp with time zone,
  "assigned_at" timestamp with time zone,
  "discount_code" text,
  "discount_amount" numeric DEFAULT 0,
  "payment_method" text DEFAULT 'manual_transfer'::text,
  "customer_id" uuid,
  "customization_notes" text,
  "tier_id" uuid,
  "cake_size" text,
  "selected_flavors" jsonb
);

CREATE TABLE public."payment_links" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "customer_email" text NOT NULL,
  "amount" numeric NOT NULL,
  "order_id" uuid,
  "link_url" text,
  "status" text DEFAULT 'pending'::text,
  "created_at" timestamp with time zone DEFAULT now(),
  "expires_at" timestamp with time zone,
  "sent_at" timestamp with time zone
);

CREATE TABLE public."admin_users" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL,
  "password_hash" text NOT NULL,
  "full_name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "role" text DEFAULT 'admin'::text
);

CREATE TABLE public."social_posts" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "platform" text NOT NULL,
  "content" text,
  "image_url" text,
  "scheduled_for" timestamp with time zone,
  "status" text DEFAULT 'draft'::text,
  "likes" integer DEFAULT 0,
  "views" integer DEFAULT 0,
  "shares" integer DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE public."social_accounts" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "platform" text NOT NULL,
  "username" text NOT NULL,
  "avatar_url" text,
  "status" text DEFAULT 'active'::text,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE public."course_payment_transactions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "training_registration_id" uuid,
  "transaction_id" text,
  "phone_number" text,
  "amount" numeric NOT NULL,
  "payment_method" text NOT NULL,
  "status" text NOT NULL,
  "hubtel_response" jsonb,
  "stripe_response" jsonb,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE public."system_settings" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "key" text NOT NULL,
  "value" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public."payment_logs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "training_registration_id" uuid NOT NULL,
  "checkout_token_id" uuid NOT NULL,
  "payment_method" text NOT NULL,
  "amount" numeric(10,2) NOT NULL,
  "phone_number" text,
  "transaction_id" text,
  "status" text NOT NULL,
  "error_message" text,
  "hubtel_response" jsonb,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."customers" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL,
  "full_name" text,
  "phone" text,
  "total_orders" integer DEFAULT 0,
  "total_spent" numeric DEFAULT 0,
  "last_order_date" timestamp with time zone,
  "accepts_marketing" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public."email_logs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "training_registration_id" uuid,
  "email_type" text NOT NULL,
  "recipient_email" text NOT NULL,
  "subject" text NOT NULL,
  "status" text NOT NULL,
  "error_message" text,
  "sent_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE public."newsletters" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "subject" text NOT NULL,
  "content" text NOT NULL,
  "image_url" text,
  "status" text DEFAULT 'draft'::text,
  "sent_at" timestamp with time zone,
  "recipients_count" integer DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public."newsletter_recipients" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "newsletter_id" uuid,
  "customer_email" text NOT NULL,
  "sent_at" timestamp with time zone DEFAULT now(),
  "status" text DEFAULT 'sent'::text
);

CREATE TABLE public."cake_flavors" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "extra_flavor_fee" numeric DEFAULT 0
);

CREATE TABLE public."cake_sizes" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "price_multiplier" numeric DEFAULT 0,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE public."cake_extras" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "category" text NOT NULL,
  "price" numeric DEFAULT 0,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE public."recipes" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "ingredients" text,
  "instructions" text,
  "price" numeric DEFAULT 0,
  "image_url" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public."training_registrations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "full_name" text NOT NULL,
  "email" text NOT NULL,
  "phone" text,
  "location" text,
  "address" text,
  "training_package_id" uuid,
  "package_title" text,
  "package_price" numeric,
  "status" text DEFAULT 'pending'::text,
  "payment_status" text DEFAULT 'Pending'::text,
  "invoice_number" text,
  "checkout_link" text,
  "payment_method" text,
  "training_mode" text,
  "google_meet_link" text,
  "meeting_scheduled_at" timestamp with time zone,
  "venue_location" text
);

CREATE TABLE public."discount_usages" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "discount_code_id" uuid,
  "order_id" uuid,
  "customer_email" text,
  "used_at" timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public."promo_deals" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "promo_code" text,
  "bg_gradient_from" text DEFAULT 'pink-500'::text,
  "bg_gradient_to" text DEFAULT 'rose-600'::text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "image_url" text,
  "discount_value" numeric DEFAULT 0,
  "discount_type" text DEFAULT 'percentage'::text
);

CREATE TABLE public."discount_codes" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "code" text NOT NULL,
  "discount_type" text NOT NULL,
  "value" numeric NOT NULL,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public."training_packages" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "duration" text NOT NULL,
  "price" numeric DEFAULT 0 NOT NULL,
  "description" text,
  "features" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE public."training_participants" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid,
  "customer_name" text NOT NULL,
  "customer_email" text NOT NULL,
  "training_title" text NOT NULL,
  "class_id" text,
  "class_link" text,
  "generated_at" timestamp with time zone DEFAULT now(),
  "email_sent" boolean DEFAULT false
);

CREATE TABLE public."smtp_settings" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "host" text NOT NULL,
  "port" integer NOT NULL,
  "username" text NOT NULL,
  "password" text NOT NULL,
  "from_email" text NOT NULL,
  "from_name" text NOT NULL,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE public."google_meet_credentials" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "gmail_account" text NOT NULL,
  "access_token" text NOT NULL,
  "refresh_token" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE public."hubtel_settings" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "client_id" text,
  "client_secret" text,
  "merchant_id" text,
  "api_endpoint" text DEFAULT 'https://api.hubtel.com/v1/merchantaccount/merchants'::text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "pos_sales_id" text
);

CREATE TABLE public."favors" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "price" numeric DEFAULT 0 NOT NULL,
  "image_url" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()),
  "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public."error_logs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "function_name" text NOT NULL,
  "error_message" text NOT NULL,
  "error_stack" text,
  "error_type" text,
  "user_id" uuid,
  "user_email" text,
  "request_data" jsonb,
  "response_data" jsonb,
  "status_code" integer,
  "severity" text,
  "resolved" boolean DEFAULT false,
  "resolved_at" timestamp with time zone,
  "resolution_notes" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE public."arbie" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "username" text NOT NULL,
  "email" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public."site_visits" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "page_path" text NOT NULL,
  "user_agent" text,
  "visitor_id" text,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "country" text,
  "city" text,
  "device_type" text,
  "ip_address" text,
  "referrer_source" text DEFAULT 'Direct Visit'::text
);

CREATE TABLE public."test_transactions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "test_phone" text,
  "test_amount" numeric,
  "merchant_reference" text,
  "hubtel_response" jsonb,
  "transaction_id" text,
  "status" text,
  "error_message" text,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "test_mode_enabled" boolean DEFAULT true
);

CREATE TABLE public."payment_tokens" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "invoice_id" uuid,
  "token" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "used_at" timestamp with time zone
);

CREATE TABLE public."income" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "source" text NOT NULL,
  "amount" numeric NOT NULL,
  "description" text NOT NULL,
  "date" date NOT NULL,
  "order_id" uuid,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE public."newsletter_logs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "newsletter_id" uuid,
  "recipient_email" text NOT NULL,
  "subject" text NOT NULL,
  "status" text NOT NULL,
  "error_message" text,
  "sent_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE public."recipe_shares" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "recipe_id" uuid NOT NULL,
  "customer_id" uuid,
  "customer_email" text NOT NULL,
  "share_type" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE public."pop_notifications" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "title" text,
  "message" text NOT NULL,
  "type" text DEFAULT 'info'::text NOT NULL,
  "is_active" boolean DEFAULT true,
  "display_on" text DEFAULT 'all_pages'::text,
  "target_pages" text[],
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE public."payment_transactions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid,
  "transaction_id" text,
  "phone_number" text,
  "amount" numeric NOT NULL,
  "payment_method" text NOT NULL,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "hubtel_response" jsonb,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "client_reference" text,
  "channel" text,
  "customer_name" text,
  "customer_email" text,
  "description" text,
  "external_transaction_id" text,
  "payment_date" timestamp with time zone,
  "charges" numeric,
  "amount_after_charges" numeric,
  "checkout_id" text,
  "sales_invoice_id" text,
  "payment_type" text,
  "customer_phone_number" text
);

CREATE TABLE public."checkout_tokens" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "training_registration_id" uuid NOT NULL,
  "checkout_token" text NOT NULL,
  "student_name" text NOT NULL,
  "student_email" text NOT NULL,
  "course_name" text NOT NULL,
  "course_id" uuid,
  "amount" numeric NOT NULL,
  "invoice_number" text NOT NULL,
  "training_mode" text,
  "is_used" boolean DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now(),
  "expires_at" timestamp with time zone NOT NULL,
  "used_at" timestamp with time zone
);

CREATE TABLE public."manual_receipts" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "training_registration_id" uuid NOT NULL,
  "student_name" text NOT NULL,
  "student_email" text NOT NULL,
  "course_name" text NOT NULL,
  "amount" numeric(10,2) NOT NULL,
  "receipt_number" text NOT NULL,
  "receipt_date" date NOT NULL,
  "sent_date" timestamp with time zone DEFAULT now(),
  "email_sent" boolean DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "payment_type" text DEFAULT 'Full Payment'::text
);

CREATE TABLE public."expenditure_categories" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."expenditures" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "description" text NOT NULL,
  "amount" numeric NOT NULL,
  "category" text DEFAULT 'Supplies'::text,
  "date" date NOT NULL,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "category_id" uuid
);

ALTER TABLE public."tiers" ADD CONSTRAINT "tiers_pkey" PRIMARY KEY (id);

ALTER TABLE public."function_logs" ADD CONSTRAINT "function_logs_pkey" PRIMARY KEY (id);

ALTER TABLE public."hero_banners" ADD CONSTRAINT "hero_banners_pkey" PRIMARY KEY (id);

ALTER TABLE public."products" ADD CONSTRAINT "products_pkey" PRIMARY KEY (id);

ALTER TABLE public."orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES auth.users(id);

ALTER TABLE public."orders" ADD CONSTRAINT "orders_order_number_key" UNIQUE (order_number);

ALTER TABLE public."orders" ADD CONSTRAINT "orders_pkey" PRIMARY KEY (id);

ALTER TABLE public."orders" ADD CONSTRAINT "orders_tier_id_fkey" FOREIGN KEY (tier_id) REFERENCES tiers(id);

ALTER TABLE public."payment_links" ADD CONSTRAINT "payment_links_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id);

ALTER TABLE public."payment_links" ADD CONSTRAINT "payment_links_pkey" PRIMARY KEY (id);

ALTER TABLE public."admin_users" ADD CONSTRAINT "admin_users_email_key" UNIQUE (email);

ALTER TABLE public."admin_users" ADD CONSTRAINT "admin_users_pkey" PRIMARY KEY (id);

ALTER TABLE public."social_posts" ADD CONSTRAINT "social_posts_pkey" PRIMARY KEY (id);

ALTER TABLE public."social_accounts" ADD CONSTRAINT "social_accounts_pkey" PRIMARY KEY (id);

ALTER TABLE public."course_payment_transactions" ADD CONSTRAINT "course_payment_transactions_pkey" PRIMARY KEY (id);

ALTER TABLE public."course_payment_transactions" ADD CONSTRAINT "course_payment_transactions_training_registration_id_fkey" FOREIGN KEY (training_registration_id) REFERENCES training_registrations(id) ON DELETE CASCADE;

ALTER TABLE public."system_settings" ADD CONSTRAINT "system_settings_key_key" UNIQUE (key);

ALTER TABLE public."system_settings" ADD CONSTRAINT "system_settings_pkey" PRIMARY KEY (id);

ALTER TABLE public."payment_logs" ADD CONSTRAINT "payment_logs_checkout_token_id_fkey" FOREIGN KEY (checkout_token_id) REFERENCES checkout_tokens(id) ON DELETE CASCADE;

ALTER TABLE public."payment_logs" ADD CONSTRAINT "payment_logs_pkey" PRIMARY KEY (id);

ALTER TABLE public."payment_logs" ADD CONSTRAINT "payment_logs_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'success'::text, 'failed'::text, 'cancelled'::text])));

ALTER TABLE public."payment_logs" ADD CONSTRAINT "payment_logs_training_registration_id_fkey" FOREIGN KEY (training_registration_id) REFERENCES training_registrations(id) ON DELETE CASCADE;

ALTER TABLE public."payment_logs" ADD CONSTRAINT "payment_logs_transaction_id_key" UNIQUE (transaction_id);

ALTER TABLE public."customers" ADD CONSTRAINT "customers_email_key" UNIQUE (email);

ALTER TABLE public."customers" ADD CONSTRAINT "customers_pkey" PRIMARY KEY (id);

ALTER TABLE public."email_logs" ADD CONSTRAINT "email_logs_email_type_check" CHECK ((email_type = ANY (ARRAY['registration'::text, 'approval'::text, 'payment_confirmation'::text, 'reminder'::text, 'invoice'::text])));

ALTER TABLE public."email_logs" ADD CONSTRAINT "email_logs_pkey" PRIMARY KEY (id);

ALTER TABLE public."email_logs" ADD CONSTRAINT "email_logs_status_check" CHECK ((status = ANY (ARRAY['sent'::text, 'failed'::text, 'pending'::text])));

ALTER TABLE public."email_logs" ADD CONSTRAINT "email_logs_training_registration_id_fkey" FOREIGN KEY (training_registration_id) REFERENCES training_registrations(id) ON DELETE CASCADE;

ALTER TABLE public."newsletters" ADD CONSTRAINT "newsletters_pkey" PRIMARY KEY (id);

ALTER TABLE public."newsletter_recipients" ADD CONSTRAINT "newsletter_recipients_newsletter_id_fkey" FOREIGN KEY (newsletter_id) REFERENCES newsletters(id) ON DELETE CASCADE;

ALTER TABLE public."newsletter_recipients" ADD CONSTRAINT "newsletter_recipients_pkey" PRIMARY KEY (id);

ALTER TABLE public."cake_flavors" ADD CONSTRAINT "cake_flavors_pkey" PRIMARY KEY (id);

ALTER TABLE public."cake_sizes" ADD CONSTRAINT "cake_sizes_pkey" PRIMARY KEY (id);

ALTER TABLE public."cake_extras" ADD CONSTRAINT "cake_extras_pkey" PRIMARY KEY (id);

ALTER TABLE public."recipes" ADD CONSTRAINT "recipes_pkey" PRIMARY KEY (id);

ALTER TABLE public."training_registrations" ADD CONSTRAINT "training_registrations_invoice_number_key" UNIQUE (invoice_number);

ALTER TABLE public."training_registrations" ADD CONSTRAINT "training_registrations_pkey" PRIMARY KEY (id);

ALTER TABLE public."training_registrations" ADD CONSTRAINT "training_registrations_training_mode_check" CHECK ((training_mode = ANY (ARRAY['Online'::text, 'In-Person'::text])));

ALTER TABLE public."training_registrations" ADD CONSTRAINT "training_registrations_training_package_id_fkey" FOREIGN KEY (training_package_id) REFERENCES training_packages(id);

ALTER TABLE public."discount_usages" ADD CONSTRAINT "discount_usages_discount_code_id_fkey" FOREIGN KEY (discount_code_id) REFERENCES discount_codes(id);

ALTER TABLE public."discount_usages" ADD CONSTRAINT "discount_usages_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id);

ALTER TABLE public."discount_usages" ADD CONSTRAINT "discount_usages_pkey" PRIMARY KEY (id);

ALTER TABLE public."promo_deals" ADD CONSTRAINT "promo_deals_pkey" PRIMARY KEY (id);

ALTER TABLE public."discount_codes" ADD CONSTRAINT "discount_codes_code_key" UNIQUE (code);

ALTER TABLE public."discount_codes" ADD CONSTRAINT "discount_codes_discount_type_check" CHECK ((discount_type = ANY (ARRAY['fixed'::text, 'percentage'::text])));

ALTER TABLE public."discount_codes" ADD CONSTRAINT "discount_codes_pkey" PRIMARY KEY (id);

ALTER TABLE public."training_packages" ADD CONSTRAINT "training_packages_pkey" PRIMARY KEY (id);

ALTER TABLE public."training_participants" ADD CONSTRAINT "training_participants_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

ALTER TABLE public."training_participants" ADD CONSTRAINT "training_participants_pkey" PRIMARY KEY (id);

ALTER TABLE public."smtp_settings" ADD CONSTRAINT "smtp_settings_pkey" PRIMARY KEY (id);

ALTER TABLE public."google_meet_credentials" ADD CONSTRAINT "google_meet_credentials_pkey" PRIMARY KEY (id);

ALTER TABLE public."hubtel_settings" ADD CONSTRAINT "hubtel_settings_pkey" PRIMARY KEY (id);

ALTER TABLE public."favors" ADD CONSTRAINT "favors_pkey" PRIMARY KEY (id);

ALTER TABLE public."error_logs" ADD CONSTRAINT "error_logs_pkey" PRIMARY KEY (id);

ALTER TABLE public."error_logs" ADD CONSTRAINT "error_logs_severity_check" CHECK ((severity = ANY (ARRAY['critical'::text, 'high'::text, 'medium'::text, 'low'::text])));

ALTER TABLE public."arbie" ADD CONSTRAINT "arbie_pkey" PRIMARY KEY (id);

ALTER TABLE public."site_visits" ADD CONSTRAINT "site_visits_pkey" PRIMARY KEY (id);

ALTER TABLE public."test_transactions" ADD CONSTRAINT "test_transactions_pkey" PRIMARY KEY (id);

ALTER TABLE public."payment_tokens" ADD CONSTRAINT "payment_tokens_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES orders(id) ON DELETE CASCADE;

ALTER TABLE public."payment_tokens" ADD CONSTRAINT "payment_tokens_pkey" PRIMARY KEY (id);

ALTER TABLE public."income" ADD CONSTRAINT "income_amount_check" CHECK ((amount > (0)::numeric));

ALTER TABLE public."income" ADD CONSTRAINT "income_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;

ALTER TABLE public."income" ADD CONSTRAINT "income_pkey" PRIMARY KEY (id);

ALTER TABLE public."income" ADD CONSTRAINT "income_source_check" CHECK ((source = ANY (ARRAY['manual'::text, 'order'::text])));

ALTER TABLE public."newsletter_logs" ADD CONSTRAINT "newsletter_logs_newsletter_id_fkey" FOREIGN KEY (newsletter_id) REFERENCES newsletters(id) ON DELETE CASCADE;

ALTER TABLE public."newsletter_logs" ADD CONSTRAINT "newsletter_logs_pkey" PRIMARY KEY (id);

ALTER TABLE public."newsletter_logs" ADD CONSTRAINT "newsletter_logs_status_check" CHECK ((status = ANY (ARRAY['sent'::text, 'failed'::text, 'pending'::text])));

ALTER TABLE public."recipe_shares" ADD CONSTRAINT "recipe_shares_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

ALTER TABLE public."recipe_shares" ADD CONSTRAINT "recipe_shares_pkey" PRIMARY KEY (id);

ALTER TABLE public."recipe_shares" ADD CONSTRAINT "recipe_shares_recipe_id_fkey" FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE;

ALTER TABLE public."recipe_shares" ADD CONSTRAINT "recipe_shares_share_type_check" CHECK ((share_type = ANY (ARRAY['email'::text, 'download'::text])));

ALTER TABLE public."pop_notifications" ADD CONSTRAINT "pop_notifications_pkey" PRIMARY KEY (id);

ALTER TABLE public."payment_transactions" ADD CONSTRAINT "payment_transactions_client_reference_key" UNIQUE (client_reference);

ALTER TABLE public."payment_transactions" ADD CONSTRAINT "payment_transactions_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

ALTER TABLE public."payment_transactions" ADD CONSTRAINT "payment_transactions_pkey" PRIMARY KEY (id);

ALTER TABLE public."checkout_tokens" ADD CONSTRAINT "checkout_tokens_checkout_token_key" UNIQUE (checkout_token);

ALTER TABLE public."checkout_tokens" ADD CONSTRAINT "checkout_tokens_pkey" PRIMARY KEY (id);

ALTER TABLE public."checkout_tokens" ADD CONSTRAINT "checkout_tokens_training_registration_id_fkey" FOREIGN KEY (training_registration_id) REFERENCES training_registrations(id) ON DELETE CASCADE;

ALTER TABLE public."manual_receipts" ADD CONSTRAINT "manual_receipts_amount_check" CHECK ((amount > (0)::numeric));

ALTER TABLE public."manual_receipts" ADD CONSTRAINT "manual_receipts_pkey" PRIMARY KEY (id);

ALTER TABLE public."manual_receipts" ADD CONSTRAINT "manual_receipts_receipt_number_key" UNIQUE (receipt_number);

ALTER TABLE public."manual_receipts" ADD CONSTRAINT "manual_receipts_training_registration_id_fkey" FOREIGN KEY (training_registration_id) REFERENCES training_registrations(id) ON DELETE CASCADE;

ALTER TABLE public."expenditure_categories" ADD CONSTRAINT "expenditure_categories_name_key" UNIQUE (name);

ALTER TABLE public."expenditure_categories" ADD CONSTRAINT "expenditure_categories_pkey" PRIMARY KEY (id);

ALTER TABLE public."expenditures" ADD CONSTRAINT "expenditures_amount_check" CHECK ((amount > (0)::numeric));

ALTER TABLE public."expenditures" ADD CONSTRAINT "expenditures_category_check" CHECK ((category = ANY (ARRAY['supplies'::text, 'utilities'::text, 'rent'::text, 'salaries'::text, 'marketing'::text, 'other'::text])));

ALTER TABLE public."expenditures" ADD CONSTRAINT "expenditures_category_id_fkey" FOREIGN KEY (category_id) REFERENCES expenditure_categories(id) ON DELETE SET NULL;

ALTER TABLE public."expenditures" ADD CONSTRAINT "expenditures_pkey" PRIMARY KEY (id);

CREATE OR REPLACE FUNCTION public.update_payment_logs_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.link_guest_orders(p_email text, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE orders
  SET customer_id = p_user_id
  WHERE customer_email = p_email AND customer_id IS NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_manual_receipts_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_error_logs_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_expenditure_categories_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_course_payment_transactions_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_google_meet_credentials_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE TRIGGER expenditure_categories_updated_at_trigger BEFORE UPDATE ON public.expenditure_categories FOR EACH ROW EXECUTE FUNCTION update_expenditure_categories_updated_at();

CREATE TRIGGER error_logs_updated_at_trigger BEFORE UPDATE ON public.error_logs FOR EACH ROW EXECUTE FUNCTION update_error_logs_updated_at();

CREATE TRIGGER course_payment_transactions_updated_at_trigger BEFORE UPDATE ON public.course_payment_transactions FOR EACH ROW EXECUTE FUNCTION update_course_payment_transactions_updated_at();

CREATE TRIGGER google_meet_credentials_updated_at_trigger BEFORE UPDATE ON public.google_meet_credentials FOR EACH ROW EXECUTE FUNCTION update_google_meet_credentials_updated_at();

CREATE TRIGGER payment_logs_updated_at_trigger BEFORE UPDATE ON public.payment_logs FOR EACH ROW EXECUTE FUNCTION update_payment_logs_updated_at();

CREATE TRIGGER manual_receipts_updated_at_trigger BEFORE UPDATE ON public.manual_receipts FOR EACH ROW EXECUTE FUNCTION update_manual_receipts_updated_at();

ALTER TABLE public."function_logs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."hero_banners" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."payment_links" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."admin_users" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."course_payment_transactions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."payment_logs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."customers" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."email_logs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."newsletters" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."cake_sizes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."cake_extras" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."recipes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."training_registrations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."training_packages" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."training_participants" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."google_meet_credentials" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."favors" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."error_logs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."arbie" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."site_visits" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."test_transactions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."payment_tokens" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."newsletter_logs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."recipe_shares" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."checkout_tokens" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."manual_receipts" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin all tiers" ON public."tiers" AS PERMISSIVE FOR ALL TO "public" USING ((auth.uid() IN ( SELECT admin_users.id
   FROM admin_users)));

CREATE POLICY "Public read tiers" ON public."tiers" AS PERMISSIVE FOR SELECT TO "public" USING (true);

CREATE POLICY "Admins View Logs" ON public."function_logs" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((auth.uid() IN ( SELECT admin_users.id
   FROM admin_users)));

CREATE POLICY "Service Role Insert Logs" ON public."function_logs" AS PERMISSIVE FOR INSERT TO "service_role" WITH CHECK (true);

CREATE POLICY "Enable all access for hero_banners" ON public."hero_banners" AS PERMISSIVE FOR ALL TO "public" USING (true) WITH CHECK (true);

CREATE POLICY "Admin all payment_links" ON public."payment_links" AS PERMISSIVE FOR ALL TO "public" USING ((auth.uid() IN ( SELECT admin_users.id
   FROM admin_users)));

CREATE POLICY "Allow all access for authenticated" ON public."admin_users" AS PERMISSIVE FOR ALL TO "public" USING (true);

CREATE POLICY "Public and service role can read admin_users" ON public."admin_users" AS PERMISSIVE FOR SELECT TO "public" USING (true);

CREATE POLICY "Allow all users to delete transactions" ON public."course_payment_transactions" AS PERMISSIVE FOR DELETE TO "public" USING (true);

CREATE POLICY "Allow all users to insert transactions" ON public."course_payment_transactions" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK (true);

CREATE POLICY "Allow all users to update transactions" ON public."course_payment_transactions" AS PERMISSIVE FOR UPDATE TO "public" USING (true) WITH CHECK (true);

CREATE POLICY "Allow all users to view transactions" ON public."course_payment_transactions" AS PERMISSIVE FOR SELECT TO "public" USING (true);

CREATE POLICY "Enable insert for all users" ON public."system_settings" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON public."system_settings" AS PERMISSIVE FOR SELECT TO "public" USING (true);

CREATE POLICY "Enable update for all users" ON public."system_settings" AS PERMISSIVE FOR UPDATE TO "public" USING (true);

CREATE POLICY "Admin users can view all payment_logs" ON public."payment_logs" AS PERMISSIVE FOR SELECT TO "public" USING ((auth.uid() IN ( SELECT admin_users.id
   FROM admin_users)));

CREATE POLICY "Service role can insert payment_logs" ON public."payment_logs" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK (true);

CREATE POLICY "Service role can update payment_logs" ON public."payment_logs" AS PERMISSIVE FOR UPDATE TO "public" USING (true) WITH CHECK (true);

CREATE POLICY "Allow public inserts/updates customers" ON public."customers" AS PERMISSIVE FOR ALL TO "public" USING (true);

CREATE POLICY "Admin users can update email logs" ON public."email_logs" AS PERMISSIVE FOR UPDATE TO "public" USING ((auth.uid() IN ( SELECT admin_users.id
   FROM admin_users)));

CREATE POLICY "Admin users can view email logs" ON public."email_logs" AS PERMISSIVE FOR SELECT TO "public" USING ((auth.uid() IN ( SELECT admin_users.id
   FROM admin_users)));

CREATE POLICY "Service role can insert email logs" ON public."email_logs" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK (true);

CREATE POLICY "Allow admin all newsletters" ON public."newsletters" AS PERMISSIVE FOR ALL TO "public" USING (true);

CREATE POLICY "Admin all cake_flavors" ON public."cake_flavors" AS PERMISSIVE FOR ALL TO "public" USING ((auth.uid() IN ( SELECT admin_users.id
   FROM admin_users)));

CREATE POLICY "Public read cake_flavors" ON public."cake_flavors" AS PERMISSIVE FOR SELECT TO "public" USING (true);

CREATE POLICY "Admin all cake_sizes" ON public."cake_sizes" AS PERMISSIVE FOR ALL TO "public" USING ((auth.uid() IN ( SELECT admin_users.id
   FROM admin_users)));

CREATE POLICY "Public read cake_sizes" ON public."cake_sizes" AS PERMISSIVE FOR SELECT TO "public" USING (true);

CREATE POLICY "Admin all cake_extras" ON public."cake_extras" AS PERMISSIVE FOR ALL TO "public" USING ((auth.uid() IN ( SELECT admin_users.id
   FROM admin_users)));

CREATE POLICY "Public read cake_extras" ON public."cake_extras" AS PERMISSIVE FOR SELECT TO "public" USING (true);

CREATE POLICY "Admins can manage recipes" ON public."recipes" AS PERMISSIVE FOR ALL TO "public" USING (true) WITH CHECK (true);

CREATE POLICY "Public recipes are viewable by everyone" ON public."recipes" AS PERMISSIVE FOR SELECT TO "public" USING (true);

CREATE POLICY "Allow admin all training_registrations" ON public."training_registrations" AS PERMISSIVE FOR ALL TO "public" USING (true);

CREATE POLICY "Allow public insert training_registrations" ON public."training_registrations" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK (true);

CREATE POLICY "Auth write promo_deals" ON public."promo_deals" AS PERMISSIVE FOR ALL TO "public" USING ((auth.role() = 'authenticated'::text));

CREATE POLICY "Public read promo_deals" ON public."promo_deals" AS PERMISSIVE FOR SELECT TO "public" USING (true);

CREATE POLICY "Enable delete for all users" ON public."training_packages" AS PERMISSIVE FOR DELETE TO "public" USING (true);

CREATE POLICY "Enable insert for all users" ON public."training_packages" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON public."training_packages" AS PERMISSIVE FOR SELECT TO "public" USING (true);

CREATE POLICY "Enable update for all users" ON public."training_packages" AS PERMISSIVE FOR UPDATE TO "public" USING (true);

CREATE POLICY "Allow admin all training_participants" ON public."training_participants" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

CREATE POLICY "Allow admin all smtp_settings" ON public."smtp_settings" AS PERMISSIVE FOR ALL TO "public" USING ((auth.uid() IN ( SELECT admin_users.id
   FROM admin_users
  WHERE (admin_users.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))));

CREATE POLICY "Admin users can delete google_meet_credentials" ON public."google_meet_credentials" AS PERMISSIVE FOR DELETE TO "public" USING ((auth.uid() IN ( SELECT admin_users.id
   FROM admin_users
  WHERE (admin_users.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))));

CREATE POLICY "Admin users can insert google_meet_credentials" ON public."google_meet_credentials" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK ((auth.uid() IN ( SELECT admin_users.id
   FROM admin_users
  WHERE (admin_users.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))));

CREATE POLICY "Admin users can update google_meet_credentials" ON public."google_meet_credentials" AS PERMISSIVE FOR UPDATE TO "public" USING ((auth.uid() IN ( SELECT admin_users.id
   FROM admin_users
  WHERE (admin_users.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))));

CREATE POLICY "Admin users can view google_meet_credentials" ON public."google_meet_credentials" AS PERMISSIVE FOR SELECT TO "public" USING ((auth.uid() IN ( SELECT admin_users.id
   FROM admin_users
  WHERE (admin_users.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))));

CREATE POLICY "Enable all access for authenticated users" ON public."hubtel_settings" AS PERMISSIVE FOR ALL TO "public" USING ((auth.role() = 'authenticated'::text));

CREATE POLICY "Admin all favors" ON public."favors" AS PERMISSIVE FOR ALL TO "public" USING ((auth.uid() IN ( SELECT admin_users.id
   FROM admin_users)));

CREATE POLICY "Public read favors" ON public."favors" AS PERMISSIVE FOR SELECT TO "public" USING (true);

CREATE POLICY "Admin users can delete errors" ON public."error_logs" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((auth.uid() IN ( SELECT admin_users.id
   FROM admin_users)));

CREATE POLICY "Admin users can update all errors" ON public."error_logs" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((auth.uid() IN ( SELECT admin_users.id
   FROM admin_users)));

CREATE POLICY "Admin users can view all errors" ON public."error_logs" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((auth.uid() IN ( SELECT admin_users.id
   FROM admin_users)));

CREATE POLICY "Authenticated users can insert errors" ON public."error_logs" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);

CREATE POLICY "Allow admin all arbie" ON public."arbie" AS PERMISSIVE FOR ALL TO "public" USING ((auth.role() = 'authenticated'::text));

CREATE POLICY "Allow admin select visits" ON public."site_visits" AS PERMISSIVE FOR SELECT TO "public" USING (true);

CREATE POLICY "Allow public inserts to visits" ON public."site_visits" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK (true);

CREATE POLICY "Enable all access for authenticated users" ON public."test_transactions" AS PERMISSIVE FOR ALL TO "public" USING ((auth.role() = 'authenticated'::text));

CREATE POLICY "Allow public select payment_tokens" ON public."payment_tokens" AS PERMISSIVE FOR SELECT TO "public" USING (true);

CREATE POLICY "Allow service role insert payment_tokens" ON public."payment_tokens" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK (true);

CREATE POLICY "Allow service role update payment_tokens" ON public."payment_tokens" AS PERMISSIVE FOR UPDATE TO "public" USING (true);

CREATE POLICY "Admin users can delete income" ON public."income" AS PERMISSIVE FOR DELETE TO "public" USING ((auth.uid() IN ( SELECT admin_users.id
   FROM admin_users)));

CREATE POLICY "Admin users can insert income" ON public."income" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK ((auth.uid() IN ( SELECT admin_users.id
   FROM admin_users)));

CREATE POLICY "Admin users can update income" ON public."income" AS PERMISSIVE FOR UPDATE TO "public" USING ((auth.uid() IN ( SELECT admin_users.id
   FROM admin_users)));

CREATE POLICY "Admin users can view all income" ON public."income" AS PERMISSIVE FOR SELECT TO "public" USING ((auth.uid() IN ( SELECT admin_users.id
   FROM admin_users)));

CREATE POLICY "Admin users can update newsletter_logs" ON public."newsletter_logs" AS PERMISSIVE FOR UPDATE TO "public" USING ((auth.uid() IN ( SELECT admin_users.id
   FROM admin_users)));

CREATE POLICY "Admin users can view newsletter_logs" ON public."newsletter_logs" AS PERMISSIVE FOR SELECT TO "public" USING ((auth.uid() IN ( SELECT admin_users.id
   FROM admin_users)));

CREATE POLICY "Service role can insert newsletter_logs" ON public."newsletter_logs" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK (true);

CREATE POLICY "Allow admins to view all recipe_shares" ON public."recipe_shares" AS PERMISSIVE FOR SELECT TO "public" USING ((auth.uid() IN ( SELECT admin_users.id
   FROM admin_users)));

CREATE POLICY "Allow authenticated users to insert recipe_shares" ON public."recipe_shares" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK ((auth.role() = 'authenticated'::text));

CREATE POLICY "Admin all pop_notifications" ON public."pop_notifications" AS PERMISSIVE FOR ALL TO "public" USING ((auth.uid() IN ( SELECT admin_users.id
   FROM admin_users)));

CREATE POLICY "Public read active pop_notifications" ON public."pop_notifications" AS PERMISSIVE FOR SELECT TO "public" USING ((is_active = true));

CREATE POLICY "Allow authenticated delete checkout_tokens" ON public."checkout_tokens" AS PERMISSIVE FOR DELETE TO "public" USING ((auth.uid() IN ( SELECT admin_users.id
   FROM admin_users)));

CREATE POLICY "Allow authenticated insert checkout_tokens" ON public."checkout_tokens" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK (true);

CREATE POLICY "Allow public select checkout_tokens by token" ON public."checkout_tokens" AS PERMISSIVE FOR SELECT TO "public" USING (true);

CREATE POLICY "Allow public update checkout_tokens" ON public."checkout_tokens" AS PERMISSIVE FOR UPDATE TO "public" USING (true);

CREATE POLICY "Admin users can view manual_receipts" ON public."manual_receipts" AS PERMISSIVE FOR SELECT TO "public" USING ((auth.uid() IN ( SELECT admin_users.id
   FROM admin_users)));

CREATE POLICY "Service role can insert manual_receipts" ON public."manual_receipts" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK (true);

CREATE POLICY "Service role can update manual_receipts" ON public."manual_receipts" AS PERMISSIVE FOR UPDATE TO "public" USING (true) WITH CHECK (true);

CREATE POLICY "Admin users can delete expenditure_categories" ON public."expenditure_categories" AS PERMISSIVE FOR DELETE TO "public" USING ((auth.uid() IN ( SELECT admin_users.id
   FROM admin_users)));

CREATE POLICY "Admin users can insert expenditure_categories" ON public."expenditure_categories" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK ((auth.uid() IN ( SELECT admin_users.id
   FROM admin_users)));

CREATE POLICY "Admin users can update expenditure_categories" ON public."expenditure_categories" AS PERMISSIVE FOR UPDATE TO "public" USING ((auth.uid() IN ( SELECT admin_users.id
   FROM admin_users))) WITH CHECK ((auth.uid() IN ( SELECT admin_users.id
   FROM admin_users)));

CREATE POLICY "Public and service role can view expenditure_categories" ON public."expenditure_categories" AS PERMISSIVE FOR SELECT TO "public" USING (true);

CREATE POLICY "Admin users can delete expenditures" ON public."expenditures" AS PERMISSIVE FOR DELETE TO "public" USING ((auth.uid() IN ( SELECT admin_users.id
   FROM admin_users)));

CREATE POLICY "Admin users can update expenditures" ON public."expenditures" AS PERMISSIVE FOR UPDATE TO "public" USING ((auth.uid() IN ( SELECT admin_users.id
   FROM admin_users)));

CREATE POLICY "Admin users can view all expenditures" ON public."expenditures" AS PERMISSIVE FOR SELECT TO "public" USING ((auth.uid() IN ( SELECT admin_users.id
   FROM admin_users)));

CREATE POLICY "Service role and admins can insert expenditures" ON public."expenditures" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK (true);

