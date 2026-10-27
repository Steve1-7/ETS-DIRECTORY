create table public.business_reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  title text not null check (char_length(title) between 3 and 120),
  body text not null check (char_length(body) between 10 and 3000),
  status public.review_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, author_id)
);

create table public.saved_businesses (
  user_id uuid not null references public.profiles(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, business_id)
);

create index business_reviews_public_idx on public.business_reviews (business_id, created_at desc) where status = 'approved';
create index business_reviews_moderation_idx on public.business_reviews (status, created_at desc);
create index saved_businesses_user_idx on public.saved_businesses (user_id, created_at desc);

alter table public.business_reviews enable row level security;
alter table public.saved_businesses enable row level security;

create policy "Approved reviews are public and authors can see their own"
on public.business_reviews for select to anon, authenticated
using (status = 'approved' or author_id = (select auth.uid()) or (select public.current_user_is_staff()));

create policy "Signed-in visitors can review published businesses once"
on public.business_reviews for insert to authenticated
with check (
  author_id = (select auth.uid())
  and status = 'pending'
  and exists (
    select 1 from public.businesses b
    where b.id = business_id and b.status = 'published' and b.owner_id <> (select auth.uid())
  )
);

create policy "Staff can moderate reviews"
on public.business_reviews for update to authenticated
using ((select public.current_user_is_staff()))
with check ((select public.current_user_is_staff()));

create policy "Users can view their saved businesses"
on public.saved_businesses for select to authenticated
using (user_id = (select auth.uid()));

create policy "Users can save published businesses"
on public.saved_businesses for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.businesses b where b.id = business_id and b.status = 'published')
);

create policy "Users can remove their saved businesses"
on public.saved_businesses for delete to authenticated
using (user_id = (select auth.uid()));

create or replace function public.get_business_rating(target_business_id uuid)
returns table (rating_average numeric, review_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(round(avg(r.rating)::numeric, 1), 0), count(*)
  from public.business_reviews r
  where r.business_id = target_business_id and r.status = 'approved'
    and exists (select 1 from public.businesses b where b.id = target_business_id and b.status = 'published');
$$;

create or replace function public.search_businesses_filtered(
  search_query text default '',
  location_query text default '',
  category_slug text default null,
  result_limit integer default 20,
  result_offset integer default 0,
  verified_only boolean default false,
  open_now boolean default false,
  sort_by text default 'relevance'
)
returns table (
  id uuid,
  name text,
  slug text,
  short_description text,
  verification_status public.verification_status,
  city text,
  province text,
  category_name text,
  logo_path text,
  rating_average numeric,
  review_count bigint,
  is_open boolean,
  is_sponsored boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  with query_input as (
    select nullif(trim(search_query), '') as term,
           websearch_to_tsquery('english', coalesce(search_query, '')) as parsed_query,
           (now() at time zone 'Africa/Johannesburg') as local_now
  ),
  matches as (
    select b.id, b.name, b.slug, b.short_description, b.verification_status,
           b.logo_path, b.published_at, b.search_document, q.term, q.parsed_query,
           location.city, location.province, category.name as category_name,
           rating.rating_average, rating.review_count,
           hours.is_open, hours.has_hours,
           promotion.is_sponsored, promotion.sponsored_rank
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
    left join lateral (
      select round(avg(r.rating)::numeric, 1) as rating_average, count(*) as review_count
      from public.business_reviews r
      where r.business_id = b.id and r.status = 'approved'
    ) rating on true
    left join lateral (
      select
        exists (select 1 from public.business_hours h where h.business_id = b.id) as has_hours,
        exists (
          select 1 from public.business_hours h
          where h.business_id = b.id
            and not h.is_closed
            and h.opening_time is not null
            and h.closing_time is not null
            and (
              (h.day_of_week = extract(dow from q.local_now)::integer
                and case when h.closing_time > h.opening_time
                  then q.local_now::time >= h.opening_time and q.local_now::time < h.closing_time
                  else q.local_now::time >= h.opening_time
                end)
              or (h.day_of_week = ((extract(dow from q.local_now)::integer + 6) % 7)
                and h.closing_time < h.opening_time and q.local_now::time < h.closing_time)
            )
        ) as is_open
    ) hours on true
    left join lateral (
      select
        coalesce(max(case when p.slug = 'premium' then 2 when p.slug = 'featured' then 1 else 0 end), 0) > 0 as is_sponsored,
        coalesce(max(case when p.slug = 'premium' then 2 when p.slug = 'featured' then 1 else 0 end), 0) as sponsored_rank
      from public.subscriptions s
      join public.subscription_plans p on p.id = s.plan_id
      where s.business_id = b.id
        and s.status = 'active'
        and s.current_period_end > now()
        and p.slug in ('featured', 'premium')
    ) promotion on true
    where b.status = 'published'
      and (q.term is null or b.search_document @@ q.parsed_query or exists (
        select 1 from public.business_services s
        where s.business_id = b.id
          and to_tsvector('english', s.name || ' ' || coalesce(s.description, '')) @@ q.parsed_query
      ))
      and (coalesce(trim(location_query), '') = '' or exists (
        select 1 from public.business_locations l
        where l.business_id = b.id
          and concat_ws(' ', l.province, l.city, l.suburb, l.service_area_description) ilike '%' || trim(location_query) || '%'
      ))
      and (category_slug is null or exists (
        select 1 from public.business_categories bc
        join public.categories c on c.id = bc.category_id
        where bc.business_id = b.id and c.slug = category_slug and c.is_active
      ))
      and (not verified_only or b.verification_status = 'verified')
      and (not open_now or hours.is_open)
  )
  select m.id, m.name, m.slug, m.short_description, m.verification_status,
         m.city, m.province, m.category_name, m.logo_path,
         coalesce(m.rating_average, 0), coalesce(m.review_count, 0), m.is_open, m.is_sponsored
  from matches m
  order by
    m.sponsored_rank desc,
    case when sort_by = 'rating' then coalesce(m.rating_average, 0) end desc nulls last,
    case when sort_by = 'newest' then m.published_at end desc nulls last,
    case when sort_by = 'relevance' and m.term is not null then ts_rank(m.search_document, m.parsed_query) end desc nulls last,
    m.published_at desc nulls last
  limit least(greatest(coalesce(result_limit, 20), 1), 50)
  offset greatest(coalesce(result_offset, 0), 0);
$$;

create or replace function public.submit_business_listing(listing_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('app.submitting_listing', 'on', true);

  update public.businesses
  set status = 'pending_review'
  where id = listing_id
    and owner_id = (select auth.uid())
    and status = 'draft';

  if not found then
    raise exception 'Listing cannot be submitted.';
  end if;
end;
$$;

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
       or new.verification_status is distinct from old.verification_status
       or new.published_at is distinct from old.published_at
       or (
         new.status is distinct from old.status
         and not (
           current_setting('app.submitting_listing', true) = 'on'
           and old.status = 'draft'
           and new.status = 'pending_review'
         )
       )
     ) then
    raise exception 'Listing ownership, publication, and verification state are managed by the platform.';
  end if;
  return new;
end;
$$;

revoke all on function public.submit_business_listing(uuid) from public, anon;
grant execute on function public.submit_business_listing(uuid) to authenticated;
