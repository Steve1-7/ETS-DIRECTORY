create table public.data_subject_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid references public.profiles(id) on delete set null,
  request_type text not null check (request_type in ('access', 'correction', 'deletion', 'listing_removal')),
  details text not null check (char_length(details) between 10 and 3000),
  status public.report_status not null default 'pending',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index data_subject_requests_status_idx
on public.data_subject_requests (status, created_at desc);

alter table public.data_subject_requests enable row level security;

create policy "Requesters and staff can view data subject requests"
on public.data_subject_requests for select to authenticated
using (requester_id = (select auth.uid()) or (select public.current_user_is_staff()));

create policy "Users can submit their own data subject requests"
on public.data_subject_requests for insert to authenticated
with check (requester_id = (select auth.uid()) and status = 'pending');

create policy "Staff can review data subject requests"
on public.data_subject_requests for update to authenticated
using ((select public.current_user_is_staff()))
with check ((select public.current_user_is_staff()));
