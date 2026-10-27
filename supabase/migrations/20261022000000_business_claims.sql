create table public.business_claim_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  evidence text not null check (char_length(evidence) between 20 and 3000),
  status public.review_status not null default 'pending',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (business_id, requester_id)
);

create index business_claim_requests_status_idx
on public.business_claim_requests (status, created_at desc);

alter table public.business_claim_requests enable row level security;

create policy "Requesters and staff can view claims"
on public.business_claim_requests for select to authenticated
using (requester_id = (select auth.uid()) or (select public.current_user_is_staff()));

create policy "Signed-in users can request published listing claims"
on public.business_claim_requests for insert to authenticated
with check (
  requester_id = (select auth.uid())
  and status = 'pending'
  and exists (select 1 from public.businesses b where b.id = business_id and b.status = 'published')
);

create policy "Staff can manage listing claims"
on public.business_claim_requests for update to authenticated
using ((select public.current_user_is_staff()))
with check ((select public.current_user_is_staff()));

create or replace function public.review_business_claim(claim_id uuid, decision public.review_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  claim_record public.business_claim_requests%rowtype;
begin
  if not (select public.current_user_is_staff()) then
    raise exception 'Staff access required.';
  end if;

  if decision not in ('approved', 'rejected', 'changes_requested') then
    raise exception 'Invalid claim decision.';
  end if;

  select * into claim_record
  from public.business_claim_requests
  where id = claim_id and status = 'pending'
  for update;

  if not found then
    raise exception 'Pending claim not found.';
  end if;

  update public.business_claim_requests
  set status = decision, reviewed_by = (select auth.uid()), reviewed_at = now()
  where id = claim_record.id;

  if decision = 'approved' then
    update public.businesses
    set owner_id = claim_record.requester_id
    where id = claim_record.business_id and status = 'published';

    if not found then
      raise exception 'Business is no longer available for claiming.';
    end if;

    update public.profiles
    set role = 'business_owner'
    where id = claim_record.requester_id and role = 'consumer';
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id)
  values ((select auth.uid()), 'claim_' || decision::text, 'business_claim_request', claim_record.id);
end;
$$;

revoke all on function public.review_business_claim(uuid, public.review_status) from public, anon;
grant execute on function public.review_business_claim(uuid, public.review_status) to authenticated;

create or replace function public.review_verification_request(request_id uuid, decision text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  verification_record public.verification_requests%rowtype;
begin
  if not (select public.current_user_is_staff()) then
    raise exception 'Staff access required.';
  end if;

  if decision not in ('approved', 'rejected') then
    raise exception 'Invalid verification decision.';
  end if;

  select * into verification_record
  from public.verification_requests
  where id = request_id and status = 'pending'
  for update;

  if not found then
    raise exception 'Pending verification request not found.';
  end if;

  update public.verification_requests
  set status = decision::public.review_status,
      reviewed_by = (select auth.uid()),
      reviewed_at = now()
  where id = verification_record.id;

  update public.businesses
  set verification_status = case when decision = 'approved' then 'verified'::public.verification_status else 'rejected'::public.verification_status end
  where id = verification_record.business_id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id)
  values ((select auth.uid()), 'verification_' || decision, 'verification_request', verification_record.id);
end;
$$;

revoke all on function public.review_verification_request(uuid, text) from public, anon;
grant execute on function public.review_verification_request(uuid, text) to authenticated;

create or replace function public.update_business_profile(
  listing_id uuid,
  profile_data jsonb,
  service_data jsonb,
  hours_data jsonb,
  location_data jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  location_id uuid;
begin
  if not exists (
    select 1 from public.businesses b
    where b.id = listing_id and b.owner_id = (select auth.uid())
  ) then
    raise exception 'Listing access required.';
  end if;

  if jsonb_typeof(profile_data) is distinct from 'object'
     or jsonb_typeof(service_data) is distinct from 'array'
     or jsonb_typeof(hours_data) is distinct from 'array'
     or jsonb_typeof(location_data) is distinct from 'object' then
    raise exception 'Invalid business profile details.';
  end if;

  if jsonb_array_length(service_data) > 50 or jsonb_array_length(hours_data) > 7 then
    raise exception 'Invalid business profile details.';
  end if;

  update public.businesses
  set name = profile_data ->> 'name',
      short_description = profile_data ->> 'short_description',
      description = profile_data ->> 'description',
      email = nullif(profile_data ->> 'email', ''),
      phone = nullif(profile_data ->> 'phone', ''),
      website = nullif(profile_data ->> 'website', ''),
      whatsapp = nullif(profile_data ->> 'whatsapp', '')
  where id = listing_id;

  delete from public.business_services where business_id = listing_id;
  insert into public.business_services (business_id, name, description, price_information)
  select listing_id, item.name, nullif(item.description, ''), nullif(item.price_information, '')
  from jsonb_to_recordset(service_data) as item(name text, description text, price_information text);

  delete from public.business_hours where business_id = listing_id;
  insert into public.business_hours (business_id, day_of_week, opening_time, closing_time, is_closed)
  select listing_id, item.day_of_week, item.opening_time, item.closing_time, item.is_closed
  from jsonb_to_recordset(hours_data) as item(day_of_week smallint, opening_time time, closing_time time, is_closed boolean);

  select l.id into location_id
  from public.business_locations l
  where l.business_id = listing_id
  order by l.created_at
  limit 1;

  if location_id is null then
    insert into public.business_locations (business_id, province, city, suburb, address, service_area_description)
    values (
      listing_id,
      location_data ->> 'province',
      location_data ->> 'city',
      nullif(location_data ->> 'suburb', ''),
      nullif(location_data ->> 'address', ''),
      nullif(location_data ->> 'service_area_description', '')
    );
  else
    update public.business_locations
    set province = location_data ->> 'province',
        city = location_data ->> 'city',
        suburb = nullif(location_data ->> 'suburb', ''),
        address = nullif(location_data ->> 'address', ''),
        service_area_description = nullif(location_data ->> 'service_area_description', '')
    where id = location_id;
  end if;
end;
$$;

revoke all on function public.update_business_profile(uuid, jsonb, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.update_business_profile(uuid, jsonb, jsonb, jsonb, jsonb) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('business-media', 'business-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

create policy "Business profile images are publicly readable"
on storage.objects for select to anon, authenticated
using (bucket_id = 'business-media');

create policy "Users upload to their own media folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'business-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users manage their own media files"
on storage.objects for delete to authenticated
using (
  bucket_id = 'business-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users update their own media files"
on storage.objects for update to authenticated
using (
  bucket_id = 'business-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'business-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
