insert into public.categories (name, slug, description)
values
  ('Home & Garden', 'home-garden', 'Home maintenance, repairs, garden services and more.'),
  ('Food & Drink', 'food-drink', 'Restaurants, cafes, catering and local food businesses.'),
  ('Professional Services', 'professional-services', 'Legal, financial, consulting and other professional services.'),
  ('Health & Wellness', 'health-wellness', 'Health practitioners, fitness and wellness services.'),
  ('Automotive', 'automotive', 'Vehicle repairs, maintenance, sales and related services.'),
  ('Business Services', 'business-services', 'Services that help local businesses grow and operate.')
on conflict (slug) do nothing;

insert into public.subscription_plans (name, slug, price_minor_units, currency_code, billing_interval, features)
values
  ('Free', 'free', 0, 'ZAR', 'month', '["One business profile", "Category and location", "Standard organic placement"]'::jsonb),
  ('Starter', 'starter', 9900, 'ZAR', 'month', '["Enhanced profile", "Website and WhatsApp links", "Additional images and services", "Basic profile analytics"]'::jsonb),
  ('Featured', 'featured', 19900, 'ZAR', 'month', '["Starter features", "Eligible sponsored placements", "Enhanced visibility reporting"]'::jsonb),
  ('Premium', 'premium', 39900, 'ZAR', 'month', '["Expanded profile features", "Enhanced analytics", "Priority support", "Additional promotional options"]'::jsonb)
on conflict (slug) do nothing;
