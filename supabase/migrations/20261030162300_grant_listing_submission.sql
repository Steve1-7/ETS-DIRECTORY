grant select on public.categories to anon, authenticated;

grant insert on
  public.businesses,
  public.business_categories,
  public.business_locations
to authenticated;
