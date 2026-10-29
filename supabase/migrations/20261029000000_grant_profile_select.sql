grant select on public.profiles to authenticated;

grant select on
  public.businesses,
  public.business_reviews,
  public.business_claim_requests,
  public.moderation_reports,
  public.verification_requests,
  public.data_subject_requests
to authenticated;

grant update on
  public.businesses,
  public.business_reviews,
  public.moderation_reports,
  public.data_subject_requests
to authenticated;
