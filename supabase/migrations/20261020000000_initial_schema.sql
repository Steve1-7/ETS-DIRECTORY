create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create type public.user_role as enum ('consumer', 'business_owner', 'moderator', 'admin');
create type public.listing_status as enum ('draft', 'pending_review', 'published', 'changes_requested', 'rejected', 'suspended', 'archived');
create type public.verification_status as enum ('unverified', 'pending', 'verified', 'rejected');
create type public.review_status as enum ('pending', 'approved', 'rejected', 'changes_requested', 'withdrawn');
create type public.subscription_status as enum ('pending', 'trialing', 'active', 'past_due', 'cancelled', 'expired', 'refunded');
create type public.payment_status as enum ('pending', 'succeeded', 'failed', 'refunded', 'partially_refunded');
create type public.report_status as enum ('pending', 'reviewing', 'resolved', 'dismissed');
create type public.enquiry_status as enum ('new', 'read', 'replied', 'closed', 'spam');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  role public.user_role not null default 'consumer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete set null,
  name text not null check (char_length(name) between 1 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  name text not null check (char_length(name) between 2 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '' check (char_length(description) <= 10000),
  short_description text not null default '' check (char_length(short_description) <= 280),
  logo_path text,
  website text,
  email text,
  phone text,
  whatsapp text,
  status public.listing_status not null default 'draft',
  verification_status public.verification_status not null default 'unverified',
  search_document tsvector generated always as (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(short_description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create table public.business_categories (
  business_id uuid not null references public.businesses(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  primary key (business_id, category_id)
);

create table public.business_locations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  country_code char(2) not null default 'ZA' check (country_code ~ '^[A-Z]{2}$'),
  province text not null check (char_length(province) <= 100),
  city text not null check (char_length(city) <= 100),
  suburb text check (char_length(suburb) <= 100),
  address text check (char_length(address) <= 300),
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  service_area_description text check (char_length(service_area_description) <= 500),
  created_at timestamptz not null default now()
);

create table public.business_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  opening_time time,
  closing_time time,
  is_closed boolean not null default false,
  unique (business_id, day_of_week),
  check (is_closed or (opening_time is not null and closing_time is not null))
);

create table public.business_services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text check (char_length(description) <= 1000),
  price_information text check (char_length(price_information) <= 200),
  created_at timestamptz not null default now()
);

create table public.business_media (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  storage_path text not null unique,
  media_type text not null check (media_type in ('logo', 'image')),
  alt_text text not null check (char_length(alt_text) between 1 and 200),
  sort_order smallint not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now()
);

create table public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  verification_method text not null check (verification_method in ('email', 'phone', 'document', 'in_person')),
  evidence_path text,
  status public.review_status not null default 'pending',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  price_minor_units integer not null check (price_minor_units >= 0),
  currency_code char(3) not null default 'ZAR' check (currency_code ~ '^[A-Z]{3}$'),
  billing_interval text not null default 'month' check (billing_interval in ('month', 'year')),
  features jsonb not null default '[]'::jsonb check (jsonb_typeof(features) = 'array'),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  plan_id uuid not null references public.subscription_plans(id) on delete restrict,
  provider text not null check (char_length(provider) <= 40),
  provider_subscription_id text unique,
  status public.subscription_status not null default 'pending',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete restrict,
  provider_reference text not null unique,
  amount_minor_units integer not null check (amount_minor_units >= 0),
  currency_code char(3) not null check (currency_code ~ '^[A-Z]{3}$'),
  status public.payment_status not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_name text not null check (char_length(customer_name) between 1 and 120),
  customer_email text not null check (char_length(customer_email) <= 254),
  message text not null check (char_length(message) between 10 and 5000),
  consent_status boolean not null default false,
  status public.enquiry_status not null default 'new',
  created_at timestamptz not null default now()
);

create table public.listing_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  event_type text not null check (event_type in ('profile_view', 'website_click', 'phone_click', 'whatsapp_click', 'directions_click', 'enquiry')),
  source text check (char_length(source) <= 100),
  created_at timestamptz not null default now()
);

create table public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  reporter_id uuid references public.profiles(id) on delete set null,
  reason text not null check (char_length(reason) between 2 and 100),
  description text check (char_length(description) <= 3000),
  status public.report_status not null default 'pending',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null check (char_length(action) <= 100),
  entity_type text not null check (char_length(entity_type) <= 100),
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index businesses_publication_idx on public.businesses (published_at desc) where status = 'published';
create index businesses_owner_idx on public.businesses (owner_id);
create index businesses_search_idx on public.businesses using gin (search_document);
create index businesses_name_trgm_idx on public.businesses using gin (name extensions.gin_trgm_ops);
create index business_services_search_idx on public.business_services using gin (to_tsvector('english', name || ' ' || coalesce(description, '')));
create index business_categories_category_idx on public.business_categories (category_id, business_id);
create index business_locations_city_idx on public.business_locations (country_code, province, city);
create index business_locations_suburb_idx on public.business_locations (suburb) where suburb is not null;
create index verification_requests_status_idx on public.verification_requests (status, created_at desc);
create index subscriptions_business_status_idx on public.subscriptions (business_id, status);
create index payments_subscription_idx on public.payments (subscription_id, created_at desc);
create index enquiries_business_idx on public.enquiries (business_id, created_at desc);
create index listing_events_business_idx on public.listing_events (business_id, event_type, created_at desc);
create index moderation_reports_status_idx on public.moderation_reports (status, created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);

create or replace function public.search_businesses(
  search_query text default '',
  location_query text default '',
  category_slug text default null,
  result_limit integer default 20,
  result_offset integer default 0
)
returns table (
  id uuid,
  name text,
  slug text,
  short_description text,
  verification_status public.verification_status,
  city text,
  province text,
  category_name text
)
language sql
stable
security invoker
set search_path = ''
as $$
  with query_input as (
    select nullif(trim(search_query), '') as term,
           websearch_to_tsquery('english', coalesce(search_query, '')) as parsed_query
  )
  select b.id,
         b.name,
         b.slug,
         b.short_description,
         b.verification_status,
         location.city,
         location.province,
         category.name
  from public.businesses b
  cross join query_input q
  left join lateral (
    select l.city, l.province
    from public.business_locations l
    where l.business_id = b.id
    order by l.created_at
    limit 1
  ) location on true
  left join lateral (
    select c.name
    from public.business_categories bc
    join public.categories c on c.id = bc.category_id
    where bc.business_id = b.id
    order by c.name
    limit 1
  ) category on true
  where b.status = 'published'
    and (q.term is null or b.search_document @@ q.parsed_query or exists (
      select 1
      from public.business_services s
      where s.business_id = b.id
        and to_tsvector('english', s.name || ' ' || coalesce(s.description, '')) @@ q.parsed_query
    ))
    and (coalesce(trim(location_query), '') = '' or exists (
      select 1
      from public.business_locations l
      where l.business_id = b.id
        and concat_ws(' ', l.province, l.city, l.suburb, l.service_area_description) ilike '%' || trim(location_query) || '%'
    ))
    and (category_slug is null or exists (
      select 1
      from public.business_categories bc
      join public.categories c on c.id = bc.category_id
      where bc.business_id = b.id and c.slug = category_slug and c.is_active
    ))
  order by
    case when q.term is null then 0
      else ts_rank(b.search_document, q.parsed_query)
    end desc,
    b.published_at desc nulls last
  limit least(greatest(coalesce(result_limit, 20), 1), 50)
  offset greatest(coalesce(result_offset, 0), 0);
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger businesses_set_updated_at before update on public.businesses
for each row execute function public.set_updated_at();
create trigger subscriptions_set_updated_at before update on public.subscriptions
for each row execute function public.set_updated_at();

create or replace function public.prevent_owner_listing_state_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
     and old.owner_id = (select auth.uid())
     and not (select public.current_user_is_staff())
     and (
       new.owner_id is distinct from old.owner_id
       or new.status is distinct from old.status
       or new.verification_status is distinct from old.verification_status
       or new.published_at is distinct from old.published_at
     ) then
    raise exception 'Listing ownership, publication, and verification state are managed by the platform.';
  end if;
  return new;
end;
$$;

create trigger businesses_protect_listing_state
before update on public.businesses
for each row execute function public.prevent_owner_listing_state_changes();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.current_user_is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('moderator', 'admin')
  );
$$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.businesses enable row level security;
alter table public.business_categories enable row level security;
alter table public.business_locations enable row level security;
alter table public.business_hours enable row level security;
alter table public.business_services enable row level security;
alter table public.business_media enable row level security;
alter table public.verification_requests enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.enquiries enable row level security;
alter table public.listing_events enable row level security;
alter table public.moderation_reports enable row level security;
alter table public.audit_logs enable row level security;

create policy "Profiles are readable by their owner and staff" on public.profiles
for select to authenticated using (id = (select auth.uid()) or (select public.current_user_is_staff()));
create policy "Users can update their own profile details" on public.profiles
for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

create policy "Active categories are public" on public.categories
for select to anon, authenticated using (is_active or (select public.current_user_is_staff()));

create policy "Published businesses are public; owners and staff can view their listings" on public.businesses
for select to anon, authenticated using (
  status = 'published'
  or owner_id = (select auth.uid())
  or (select public.current_user_is_staff())
);
create policy "Owners can create draft listings" on public.businesses
for insert to authenticated with check (owner_id = (select auth.uid()) and status = 'draft' and verification_status = 'unverified');
create policy "Owners can edit their own listings" on public.businesses
for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Staff can manage listings" on public.businesses
for all to authenticated using ((select public.current_user_is_staff())) with check ((select public.current_user_is_staff()));

create policy "Business categories follow business visibility" on public.business_categories
for select to anon, authenticated using (exists (select 1 from public.businesses b where b.id = business_id and (b.status = 'published' or b.owner_id = (select auth.uid()) or (select public.current_user_is_staff()))));
create policy "Owners manage categories for their listings" on public.business_categories
for all to authenticated using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid()))) with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())));

create policy "Locations follow business visibility" on public.business_locations
for select to anon, authenticated using (exists (select 1 from public.businesses b where b.id = business_id and (b.status = 'published' or b.owner_id = (select auth.uid()) or (select public.current_user_is_staff()))));
create policy "Owners manage their business locations" on public.business_locations
for all to authenticated using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid()))) with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())));

create policy "Business hours follow business visibility" on public.business_hours
for select to anon, authenticated using (exists (select 1 from public.businesses b where b.id = business_id and (b.status = 'published' or b.owner_id = (select auth.uid()) or (select public.current_user_is_staff()))));
create policy "Owners manage their business hours" on public.business_hours
for all to authenticated using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid()))) with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())));

create policy "Services follow business visibility" on public.business_services
for select to anon, authenticated using (exists (select 1 from public.businesses b where b.id = business_id and (b.status = 'published' or b.owner_id = (select auth.uid()) or (select public.current_user_is_staff()))));
create policy "Owners manage their business services" on public.business_services
for all to authenticated using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid()))) with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())));

create policy "Media follows business visibility" on public.business_media
for select to anon, authenticated using (exists (select 1 from public.businesses b where b.id = business_id and (b.status = 'published' or b.owner_id = (select auth.uid()) or (select public.current_user_is_staff()))));
create policy "Owners manage their business media" on public.business_media
for all to authenticated using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid()))) with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())));

create policy "Users can view their own verification requests" on public.verification_requests
for select to authenticated using (user_id = (select auth.uid()) or (select public.current_user_is_staff()));
create policy "Owners can submit verification requests" on public.verification_requests
for insert to authenticated with check (
  user_id = (select auth.uid()) and status = 'pending'
  and exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid()))
);
create policy "Staff can review verification requests" on public.verification_requests
for update to authenticated using ((select public.current_user_is_staff())) with check ((select public.current_user_is_staff()));

create policy "Active plans are public" on public.subscription_plans
for select to anon, authenticated using (is_active);
create policy "Staff can manage plans" on public.subscription_plans
for all to authenticated using ((select public.current_user_is_staff())) with check ((select public.current_user_is_staff()));

create policy "Owners can view their subscriptions" on public.subscriptions
for select to authenticated using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())) or (select public.current_user_is_staff()));
create policy "Staff can manage subscriptions" on public.subscriptions
for all to authenticated using ((select public.current_user_is_staff())) with check ((select public.current_user_is_staff()));

create policy "Owners can view payment history" on public.payments
for select to authenticated using (exists (select 1 from public.subscriptions s join public.businesses b on b.id = s.business_id where s.id = subscription_id and b.owner_id = (select auth.uid())) or (select public.current_user_is_staff()));
create policy "Staff can manage payments" on public.payments
for all to authenticated using ((select public.current_user_is_staff())) with check ((select public.current_user_is_staff()));

create policy "Business owners can view their enquiries" on public.enquiries
for select to authenticated using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())) or (select public.current_user_is_staff()));
create policy "Visitors can submit enquiries to published listings" on public.enquiries
for insert to anon, authenticated with check (status = 'new' and exists (select 1 from public.businesses b where b.id = business_id and b.status = 'published'));
create policy "Owners can update enquiry status" on public.enquiries
for update to authenticated using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid()))) with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())));

create policy "Business owners can view their listing events" on public.listing_events
for select to authenticated using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())) or (select public.current_user_is_staff()));
create policy "Visitors can register events on published listings" on public.listing_events
for insert to anon, authenticated with check (exists (select 1 from public.businesses b where b.id = business_id and b.status = 'published'));

create policy "Users can view their own moderation reports" on public.moderation_reports
for select to authenticated using (reporter_id = (select auth.uid()) or (select public.current_user_is_staff()));
create policy "Visitors can report published listings" on public.moderation_reports
for insert to anon, authenticated with check (
  status = 'pending'
  and reporter_id is not distinct from (select auth.uid())
  and exists (select 1 from public.businesses b where b.id = business_id and b.status = 'published')
);
create policy "Staff can review reports" on public.moderation_reports
for update to authenticated using ((select public.current_user_is_staff())) with check ((select public.current_user_is_staff()));

create policy "Staff can read audit logs" on public.audit_logs
for select to authenticated using ((select public.current_user_is_staff()));
create policy "Staff can add audit logs" on public.audit_logs
for insert to authenticated with check ((select public.current_user_is_staff()) and actor_id = (select auth.uid()));
