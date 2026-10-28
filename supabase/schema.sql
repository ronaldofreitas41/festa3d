-- Festa 3D: tabelas e bucket de arquivos.
-- Rode uma vez no Supabase: Dashboard > SQL Editor > New query > cole e clique em Run.
--
-- O app só acessa o banco pelo servidor (rotas /api) usando a SUPABASE_SECRET_KEY,
-- que ignora o RLS. Por isso o RLS fica LIGADO e SEM políticas: a chave pública
-- (publishable) que vai para o navegador não consegue ler nem alterar nada.
-- Cada linha tem um dono (owner_id = usuário do Supabase Auth); o servidor filtra por ele
-- e, ao excluir o usuário, as linhas dele saem em cascata.

create table if not exists public.items (
  id text primary key,
  name text not null,
  quantity integer not null default 1 check (quantity >= 1),
  photo text not null,
  cutout text,
  height double precision not null default 0.5,
  glb text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'ready', 'failed')),
  provider text not null default 'cutout' check (provider in ('meshy', 'trellis', 'cutout')),
  task_id text,
  progress integer not null default 0,
  error text,
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.venues (
  id text primary key,
  name text not null,
  photo text not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id text primary key,
  name text not null,
  venue_id text references public.venues (id) on delete set null,
  backdrop text not null default 'none' check (backdrop in ('none', 'wall', 'floor', 'panorama')),
  width double precision not null default 10,
  depth double precision not null default 8,
  floor_color text not null default '#e9e2d6',
  placed jsonb not null default '[]'::jsonb,
  owner_id uuid not null references auth.users (id) on delete cascade,
  updated_at timestamptz not null default now()
);

create index if not exists events_venue_id_idx on public.events (venue_id);
create index if not exists items_owner_id_idx on public.items (owner_id);
create index if not exists venues_owner_id_idx on public.venues (owner_id);
create index if not exists events_owner_id_idx on public.events (owner_id);

alter table public.items enable row level security;
alter table public.venues enable row level security;
alter table public.events enable row level security;

-- Acesso explícito só para a chave secreta (service_role), caso o projeto não exponha tabelas novas sozinho.
grant select, insert, update, delete on public.items, public.venues, public.events to service_role;

-- Bucket privado para fotos, recortes e modelos .glb (servidos pela rota /api/files).
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', false)
on conflict (id) do nothing;
