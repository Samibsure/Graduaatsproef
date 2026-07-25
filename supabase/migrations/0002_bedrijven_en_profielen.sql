-- 0002_bedrijven_en_profielen.sql
--
-- Voert het bedrijfsbegrip in. Vanaf hier hoort elke gebruiker bij precies één
-- bedrijf, en kan één bedrijf meerdere collega's hebben.
--
-- Bewust géén losse memberships-tabel: één gebruiker in meerdere bedrijven is
-- een scenario dat vandaag niet nodig is. Omdat alle policies via de functie
-- huidig_bedrijf_id() lopen, is die uitbreiding later een wijziging in één
-- functie in plaats van in elke policy.

create table if not exists public.companies (
  id                 uuid primary key default gen_random_uuid(),
  naam               text not null check (length(trim(naam)) between 2 and 120),
  ondernemingsnummer text,
  created_at         timestamptz not null default now()
);

do $$ begin
  create type public.bedrijfsrol as enum ('lid', 'beheerder');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  company_id        uuid not null references public.companies (id) on delete cascade,
  volledige_naam    text,
  rol               public.bedrijfsrol not null default 'lid',
  is_platform_admin boolean not null default false,
  created_at        timestamptz not null default now()
);

create index if not exists profiles_company_id_idx on public.profiles (company_id);

-- ---------------------------------------------------------------------------
-- Twee hulpfuncties waar élke policy op steunt.
--
-- security definer is hier noodzakelijk: de functies lezen profiles zonder zelf
-- door RLS te gaan, anders ontstaat een oneindige lus (policy op profiles die
-- profiles bevraagt). set search_path = '' hoort daarbij: zonder die regel is
-- een security definer-functie een pad naar privilege-escalatie.
-- ---------------------------------------------------------------------------

create or replace function public.huidig_bedrijf_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select company_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select is_platform_admin from public.profiles where id = auth.uid()), false)
$$;

-- ---------------------------------------------------------------------------
-- Uitnodigingen voor collega's
-- ---------------------------------------------------------------------------

create table if not exists public.uitnodigingen (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies (id) on delete cascade,
  email            text not null,
  rol              public.bedrijfsrol not null default 'lid',
  uitgenodigd_door uuid references auth.users (id) on delete set null,
  vervalt_op       timestamptz not null default now() + interval '14 days',
  aanvaard_op      timestamptz,
  created_at       timestamptz not null default now()
);

-- Eén openstaande uitnodiging per e-mailadres per bedrijf.
create unique index if not exists uitnodigingen_openstaand_uniek
  on public.uitnodigingen (company_id, lower(email))
  where aanvaard_op is null;

create index if not exists uitnodigingen_email_idx on public.uitnodigingen (lower(email));

-- ---------------------------------------------------------------------------
-- Registratie: bedrijf aanmaken of aansluiten bij een uitnodiging.
--
-- Dit gebeurt in een trigger en niet in de client, omdat een aanroep vanuit de
-- browser kan mislukken nádat signUp() al geslaagd is. Je houdt dan een
-- gebruiker over zonder bedrijf, die vervolgens overal een lege pagina ziet.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uitnodiging  public.uitnodigingen%rowtype;
  nieuw_bedrijf uuid;
  bedrijfsnaam text;
begin
  select * into uitnodiging
  from public.uitnodigingen
  where lower(email) = lower(new.email)
    and aanvaard_op is null
    and vervalt_op > now()
  order by created_at desc
  limit 1;

  if found then
    insert into public.profiles (id, company_id, volledige_naam, rol)
    values (
      new.id,
      uitnodiging.company_id,
      nullif(trim(new.raw_user_meta_data ->> 'volledige_naam'), ''),
      uitnodiging.rol
    );

    update public.uitnodigingen set aanvaard_op = now() where id = uitnodiging.id;
    return new;
  end if;

  -- Geen uitnodiging: de gebruiker start een eigen bedrijf en wordt beheerder.
  bedrijfsnaam := nullif(trim(new.raw_user_meta_data ->> 'bedrijfsnaam'), '');
  if bedrijfsnaam is null then
    bedrijfsnaam := split_part(new.email, '@', 2);
  end if;

  insert into public.companies (naam, ondernemingsnummer)
  values (
    bedrijfsnaam,
    nullif(trim(new.raw_user_meta_data ->> 'ondernemingsnummer'), '')
  )
  returning id into nieuw_bedrijf;

  insert into public.profiles (id, company_id, volledige_naam, rol)
  values (
    new.id,
    nieuw_bedrijf,
    nullif(trim(new.raw_user_meta_data ->> 'volledige_naam'), ''),
    'beheerder'
  );

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
