create table public.site_activity_events (
  id bigint generated always as identity primary key,
  session_id uuid not null,
  event_type text not null check (event_type in ('page_view', 'search')),
  page_path text not null check (
    char_length(page_path) between 1 and 300
    and page_path like '/%'
    and page_path not like '//%'
    and position('?' in page_path) = 0
    and position('#' in page_path) = 0
  ),
  referrer_domain text check (
    referrer_domain is null
    or (
      char_length(referrer_domain) between 1 and 253
      and referrer_domain = lower(referrer_domain)
      and referrer_domain ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$'
    )
  ),
  device_category text not null check (device_category in ('mobile', 'tablet', 'desktop')),
  created_at timestamptz not null default now()
);

create index site_activity_events_created_idx on public.site_activity_events (created_at desc);
create index site_activity_events_session_idx on public.site_activity_events (session_id, created_at desc);
create index site_activity_events_path_idx on public.site_activity_events (created_at desc, page_path);
alter table public.site_activity_events enable row level security;

create policy "Staff can view site activity"
on public.site_activity_events for select to authenticated
using ((select public.current_user_is_staff()));
grant select on public.site_activity_events to authenticated;

create or replace function public.record_site_activity(
  target_session_id uuid,
  target_event_type text,
  target_page_path text,
  target_referrer_domain text,
  target_device_category text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_session_id is null
     or target_event_type not in ('page_view', 'search')
     or target_page_path is null
     or char_length(target_page_path) not between 1 and 300
     or target_page_path not like '/%'
     or target_page_path like '//%'
     or position('?' in target_page_path) > 0
     or position('#' in target_page_path) > 0
     or target_device_category not in ('mobile', 'tablet', 'desktop')
     or (
       target_referrer_domain is not null
       and (
         char_length(target_referrer_domain) not between 1 and 253
         or target_referrer_domain <> lower(target_referrer_domain)
         or target_referrer_domain !~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$'
       )
     ) then
    raise exception 'Invalid site activity event.';
  end if;

  insert into public.site_activity_events (
    session_id, event_type, page_path, referrer_domain, device_category
  ) values (
    target_session_id, target_event_type, target_page_path, target_referrer_domain, target_device_category
  );
end;
$$;

revoke all on function public.record_site_activity(uuid, text, text, text, text) from public;
grant execute on function public.record_site_activity(uuid, text, text, text, text) to anon, authenticated;

create or replace function public.admin_site_activity_analytics(window_start timestamptz)
returns table (metric text, dimension text, event_count bigint, visitor_sessions bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  with recent_activity as (
    select e.session_id, e.event_type, e.page_path, e.referrer_domain, e.device_category, e.created_at
    from public.site_activity_events e
    where e.created_at >= window_start
  ),
  recent_listing_events as (
    select e.event_type, e.created_at
    from public.listing_events e
    where e.created_at >= window_start
  ),
  page_counts as (
    select page_path, count(*)::bigint as event_count, count(distinct session_id)::bigint as visitor_sessions
    from recent_activity
    where event_type = 'page_view'
    group by page_path
    order by count(*) desc
    limit 10
  ),
  referrer_counts as (
    select coalesce(referrer_domain, 'Direct or unknown') as dimension,
      count(*)::bigint as event_count, count(distinct session_id)::bigint as visitor_sessions
    from recent_activity
    where event_type = 'page_view'
    group by referrer_domain
    order by count(*) desc
    limit 8
  )
  select 'summary', 'page_views', count(*)::bigint, count(distinct session_id)::bigint
  from recent_activity where event_type = 'page_view'
  union all
  select 'summary', 'visitor_sessions', count(distinct session_id)::bigint, count(distinct session_id)::bigint
  from recent_activity
  union all
  select 'summary', 'searches', count(*)::bigint, count(distinct session_id)::bigint
  from recent_activity where event_type = 'search'
  union all
  select 'summary', 'listing_interactions', count(*)::bigint, 0::bigint
  from recent_listing_events
  union all
  select 'daily', created_at::date::text, count(*)::bigint, count(distinct session_id)::bigint
  from recent_activity where event_type = 'page_view'
  group by created_at::date
  union all
  select 'page', page_path, event_count, visitor_sessions
  from page_counts
  union all
  select 'referrer', dimension, event_count, visitor_sessions
  from referrer_counts
  union all
  select 'device', device_category, count(*)::bigint, count(distinct session_id)::bigint
  from recent_activity where event_type = 'page_view'
  group by device_category
  union all
  select 'listing_event', event_type, count(*)::bigint, 0::bigint
  from recent_listing_events
  group by event_type
  order by 1, 2;
$$;

revoke all on function public.admin_site_activity_analytics(timestamptz) from public, anon;
grant execute on function public.admin_site_activity_analytics(timestamptz) to authenticated;

create extension if not exists pg_cron with schema pg_catalog;

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'delete-expired-analytics-events') then
    perform cron.schedule(
      'delete-expired-analytics-events',
      '17 * * * *',
      'delete from public.site_activity_events where created_at < now() - interval ''30 days'''
    );
  end if;
  if not exists (select 1 from cron.job where jobname = 'delete-expired-listing-events') then
    perform cron.schedule(
      'delete-expired-listing-events',
      '23 * * * *',
      'delete from public.listing_events where created_at < now() - interval ''30 days'''
    );
  end if;
end;
$$;
