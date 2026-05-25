create table public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  endpoint text not null,
  model text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cache_creation_input_tokens int not null default 0,
  cache_read_input_tokens int not null default 0,
  created_at timestamptz not null default now()
);

create index ai_usage_logs_user_created_idx
  on public.ai_usage_logs(user_id, created_at desc);
create index ai_usage_logs_endpoint_created_idx
  on public.ai_usage_logs(endpoint, created_at desc);

alter table public.ai_usage_logs enable row level security;
-- No policies: only service_role inserts. Clients cannot read or write directly.
