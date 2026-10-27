create table public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 100),
  query text not null default '' check (char_length(query) <= 100),
  location text not null default '' check (char_length(location) <= 100),
  category_slug text,
  verified_only boolean not null default false,
  open_now boolean not null default false,
  sort_by text not null default 'relevance' check (sort_by in ('relevance', 'rating', 'newest')),
  created_at timestamptz not null default now()
);

create index saved_searches_user_idx on public.saved_searches (user_id, created_at desc);
alter table public.saved_searches enable row level security;

create policy "Users manage their own saved searches"
on public.saved_searches for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create or replace function public.owner_listing_analytics(window_start timestamptz)
returns table (business_id uuid, event_type text, event_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select e.business_id, e.event_type, count(*)
  from public.listing_events e
  where e.created_at >= window_start
    and exists (
      select 1 from public.businesses b
      where b.id = e.business_id and b.owner_id = (select auth.uid())
    )
  group by e.business_id, e.event_type;
$$;

revoke all on function public.owner_listing_analytics(timestamptz) from public, anon;
grant execute on function public.owner_listing_analytics(timestamptz) to authenticated;

create or replace function public.start_paystack_checkout(
  target_business_id uuid,
  target_plan_slug text,
  payment_reference text
)
returns table (amount_minor_units integer, currency_code char(3))
language plpgsql
security definer
set search_path = ''
as $$
declare
  plan_record public.subscription_plans%rowtype;
  subscription_id uuid;
begin
  if (select auth.uid()) is null or payment_reference !~ '^[0-9a-f-]{36}$' then
    raise exception 'Invalid checkout request.';
  end if;

  if not exists (
    select 1 from public.businesses b
    where b.id = target_business_id
      and b.owner_id = (select auth.uid())
      and b.status = 'published'
  ) then
    raise exception 'Only published listings you own can be promoted.';
  end if;

  select * into plan_record
  from public.subscription_plans
  where slug = target_plan_slug
    and is_active
    and slug in ('featured', 'premium')
  for share;

  if not found or plan_record.price_minor_units <= 0 or plan_record.currency_code <> 'ZAR' then
    raise exception 'Plan is unavailable.';
  end if;

  if exists (
    select 1 from public.subscriptions s
    join public.subscription_plans active_plan on active_plan.id = s.plan_id
    where s.business_id = target_business_id
      and s.status = 'active'
      and s.current_period_end > now()
      and active_plan.slug in ('featured', 'premium')
  ) then
    raise exception 'This listing already has an active promotion.';
  end if;

  insert into public.subscriptions (business_id, plan_id, provider, status)
  values (target_business_id, plan_record.id, 'paystack', 'pending')
  returning id into subscription_id;

  insert into public.payments (subscription_id, provider_reference, amount_minor_units, currency_code, status)
  values (subscription_id, payment_reference, plan_record.price_minor_units, plan_record.currency_code, 'pending');

  return query select plan_record.price_minor_units, plan_record.currency_code;
end;
$$;

revoke all on function public.start_paystack_checkout(uuid, text, text) from public, anon;
grant execute on function public.start_paystack_checkout(uuid, text, text) to authenticated;

create or replace function public.fail_paystack_checkout(payment_reference text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.payments p
  set status = 'failed'
  from public.subscriptions s
  join public.businesses b on b.id = s.business_id
  where p.subscription_id = s.id
    and p.provider_reference = payment_reference
    and p.status = 'pending'
    and b.owner_id = (select auth.uid());

  update public.subscriptions s
  set status = 'expired'
  where s.id in (
    select p.subscription_id from public.payments p
    where p.provider_reference = payment_reference and p.status = 'failed'
  );
end;
$$;

revoke all on function public.fail_paystack_checkout(text) from public, anon;
grant execute on function public.fail_paystack_checkout(text) to authenticated;

create or replace function public.confirm_paystack_payment(
  payment_reference text,
  transaction_id text,
  confirmed_amount integer,
  confirmed_currency text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  payment_record public.payments%rowtype;
begin
  select * into payment_record
  from public.payments
  where provider_reference = payment_reference
  for update;

  if not found then
    raise exception 'Payment reference not found.';
  end if;

  if payment_record.status = 'succeeded' then
    return;
  end if;

  if payment_record.status <> 'pending'
     or payment_record.amount_minor_units <> confirmed_amount
     or payment_record.currency_code <> confirmed_currency then
    raise exception 'Payment details do not match the pending checkout.';
  end if;

  update public.payments
  set status = 'succeeded', paid_at = now()
  where id = payment_record.id;

  update public.subscriptions
  set status = 'active',
      current_period_start = now(),
      current_period_end = now() + interval '1 month'
  where id = payment_record.subscription_id and status = 'pending';

  insert into public.audit_logs (action, entity_type, entity_id, metadata)
  values (
    'payment_succeeded',
    'payment',
    payment_record.id,
    jsonb_build_object('provider', 'paystack', 'transaction_id', transaction_id)
  );
end;
$$;

revoke all on function public.confirm_paystack_payment(text, text, integer, text) from public, anon, authenticated;
grant execute on function public.confirm_paystack_payment(text, text, integer, text) to service_role;
