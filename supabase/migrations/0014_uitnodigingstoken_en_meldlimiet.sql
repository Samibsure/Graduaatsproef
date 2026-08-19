-- 0014_uitnodigingstoken_en_meldlimiet.sql
--
-- Twee gaten die pas zichtbaar worden zodra de applicatie publiek staat.
--
--
-- 1. Een uitnodiging koppelde op niets anders dan een e-mailadres
-- ---------------------------------------------------------------------------
--
-- handle_new_user() zocht bij elke registratie een openstaande uitnodiging op
-- `lower(email)` en zette het nieuwe profiel in dát bedrijf. Er was geen token,
-- geen aanvaardingsstap en geen controle dat het uitnodigende bedrijf iets met
-- dat adres te maken had. Tegelijk is elke zelf-geregistreerde gebruiker
-- beheerder van zijn eigen bedrijf, en laat uitnodigingen_beheer een beheerder
-- rijen invoegen met een willekeurig adres: de WITH CHECK begrenst alleen
-- company_id, niet email.
--
-- Iedereen kon dus vanuit de browserconsole duizend adressen planten:
--
--   await supabase.from('uitnodigingen').insert([{ email: 'x@doelbedrijf.be' }])
--
-- Er vertrekt geen mail, dus het slachtoffer merkt niets. Registreert iemand van
-- die lijst zich later zelf, dan krijgt hij geen eigen bedrijf maar landt zijn
-- profiel in dat van de aanvaller, die vanaf dan de volledige vloot, de
-- werknemersnamen, de kentekens en de bewaarde beslissingen leest en wijzigt.
-- Omdat de selectie `order by created_at desc` deed, overschreef een geplante
-- uitnodiging bovendien een legitieme.
--
-- supabase/README.md noemde dit risico al, maar alleen in de omgekeerde
-- richting (iemand die zich voordoet als een uitgenodigd adres) en met
-- e-mailbevestiging als antwoord. Dat helpt hier niet: het slachtoffer bezit het
-- adres en bevestigt het gewoon. De trigger staat bovendien op
-- `after insert on auth.users` en draait dus vóór die bevestiging.
--
-- Vanaf nu koppelt de trigger alleen wanneer de registratie het token van de
-- uitnodiging meestuurt. Wie zonder geldig token registreert, krijgt een eigen
-- bedrijf -- precies het gedrag dat iedereen zonder uitnodiging al had. De
-- beheerder deelt de link uit /instellingen; die bevat het token.
--
--
-- 2. De meldknop kon de databank volschrijven
-- ---------------------------------------------------------------------------
--
-- feedback_insert staat op `with check (true)` voor anon, omdat de simulator en
-- de catalogus publiek zijn en de fouten die daar opvallen van bezoekers zonder
-- account komen. Dat blijft zo. Wat ontbrak was een bovengrens: met ongeveer
-- 5 kB per rij is de schijf van een gratis project met een lus van tweehonderd-
-- duizend inserts vol, en dan kan géén enkel bedrijf nog een wagen bewaren.
--
-- De rem staat hier en niet in de browser, want de browser is precies wat
-- omzeild wordt. Een trigger is genoeg: hij telt de meldingen van het laatste
-- uur en weigert daarboven. De grens ligt ruim genoeg dat een echte gebruiker
-- ze nooit raakt -- ook niet wanneer een school of een kantoor achter één
-- verbinding meldt -- en laag genoeg dat volschrijven onbegonnen werk wordt.


-- ================================================ 1. uitnodigingstoken ===

alter table public.uitnodigingen
  add column if not exists token uuid not null default gen_random_uuid();

-- Twee bedrijven mogen hetzelfde adres uitnodigen, maar nooit hetzelfde token.
create unique index if not exists uitnodigingen_token_uniek
  on public.uitnodigingen (token);

-- Het token is de sleutel tot het bedrijf. Alleen wie de uitnodiging beheert
-- mag hem lezen; de policies uit 0003 en 0006 doen dat al op rijniveau, en het
-- SELECT-recht op de tabel is er al. Er komt hier dus geen recht bij.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uitnodiging   public.uitnodigingen%rowtype;
  nieuw_bedrijf uuid;
  bedrijfsnaam  text;
  aangeboden    uuid;
begin
  -- Het token komt uit de metadata die het registratieformulier meestuurt. Een
  -- ongeldige waarde is geen fout maar simpelweg geen uitnodiging: dan volgt
  -- hieronder het gewone pad met een eigen bedrijf.
  begin
    aangeboden := nullif(trim(new.raw_user_meta_data ->> 'uitnodiging_token'), '')::uuid;
  exception when invalid_text_representation then
    aangeboden := null;
  end;

  if aangeboden is not null then
    -- Token én adres moeten kloppen. Alleen het token zou volstaan om te
    -- koppelen, maar dan kan wie een link doorstuurt iemand anders binnenhalen
    -- onder de rol die voor de uitgenodigde bedoeld was.
    select * into uitnodiging
    from public.uitnodigingen
    where token = aangeboden
      and lower(email) = lower(new.email)
      and aanvaard_op is null
      and vervalt_op > now()
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
  end if;

  -- Geen geldige uitnodiging: de gebruiker start een eigen bedrijf en wordt
  -- beheerder.
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


-- =================================================== 2. meldingslimiet ===

create or replace function public.feedback_begrenzen()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  laatste_uur integer;
begin
  select count(*) into laatste_uur
  from public.feedback
  where created_at > now() - interval '1 hour';

  if laatste_uur >= 200 then
    raise exception 'Er zijn de laatste tijd te veel meldingen binnengekomen. Probeer het straks opnieuw of mail ons rechtstreeks.'
      using errcode = '53400';
  end if;

  return new;
end $$;

revoke execute on function public.feedback_begrenzen() from public, anon, authenticated;

drop trigger if exists feedback_limiet on public.feedback;
create trigger feedback_limiet
  before insert on public.feedback
  for each row execute function public.feedback_begrenzen();
