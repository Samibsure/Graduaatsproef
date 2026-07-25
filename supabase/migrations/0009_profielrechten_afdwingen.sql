-- 0009_profielrechten_afdwingen.sql
--
-- Een aangemelde gebruiker kon zichzelf tot platformbeheerder maken:
--
--   update profiles set is_platform_admin = true where id = auth.uid();
--
-- De policy profiles_update_eigen liet het eigen profiel bijwerken en
-- controleerde alleen id en company_id. RLS werkt per rij, niet per kolom, dus
-- de rol- en beheerdersvelden lagen open. Platformbeheer geeft schrijfrecht op
-- de nationale fiscale parameters van álle bedrijven, en toegang tot
-- herstel_standaardwaarden(). Dit was de ernstigste fout in het model.
--
-- Twee sloten, die los van elkaar volstaan.

-- Slot 1: de API mag alleen nog de velden aanraken die ze nodig heeft.
-- Kolomrechten zijn wat RLS niet kan.
revoke update on public.profiles from anon, authenticated;
grant update (volledige_naam, rol) on public.profiles to authenticated;

-- Slot 2: een trigger, voor het geval de rechten ooit opnieuw ruimer gezet
-- worden. Die bewaakt ook de regel die met kolomrechten niet uit te drukken
-- is: de rol van een collega mag je wijzigen, je eigen rol nooit.
create or replace function public.profielwijziging_bewaken()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Zonder sessie komt de wijziging uit de SQL-editor of van de service role.
  -- Die blijft ongemoeid, anders is er met de hand geen platformbeheerder meer
  -- aan te duiden.
  if auth.uid() is null then
    return new;
  end if;

  if new.id                is distinct from old.id
  or new.company_id        is distinct from old.company_id
  or new.created_at        is distinct from old.created_at
  or new.is_platform_admin is distinct from old.is_platform_admin then
    raise exception 'Identiteit, bedrijf en platformbeheer van een profiel liggen vast'
      using errcode = '42501';
  end if;

  if new.rol is distinct from old.rol then
    if old.id = auth.uid() then
      raise exception 'Je kan je eigen rol niet wijzigen'
        using errcode = '42501';
    end if;
    if not public.is_beheerder() then
      raise exception 'Alleen een beheerder kan de rol van een collega wijzigen'
        using errcode = '42501';
    end if;
  end if;

  return new;
end $$;

drop trigger if exists profielwijziging_bewaken on public.profiles;
create trigger profielwijziging_bewaken
  before update on public.profiles
  for each row execute function public.profielwijziging_bewaken();

-- Dezelfde gedachte voor de overige tabellen: primaire sleutels, de koppeling
-- aan een bedrijf en het aanmaakmoment horen niet bij wat een formulier mag
-- overschrijven. De RLS-policies hielden een rij al binnen het eigen bedrijf;
-- dit maakt de bedoeling expliciet in plaats van afgeleid.
revoke update on public.companies     from anon, authenticated;
revoke update on public.vehicles      from anon, authenticated;
revoke update on public.evaluations   from anon, authenticated;
revoke update on public.uitnodigingen from anon, authenticated;

grant update (naam, ondernemingsnummer, btw_nummer, adres, postcode, gemeente,
              is_kmo, boekjaar_start_maand, logo_url, onboarding_voltooid)
  on public.companies to authenticated;

grant update (omschrijving, werknemer, kenteken, categorie, merk, model, catalog_id,
              voertuigtype, brandstof, besteldatum, eerste_ingebruikname, co2,
              cataloguswaarde, jaarlijkse_autokosten, aankoopprijs, tankkaart,
              beroepsgebruik_pct, thuislaadpunt, km_per_jaar, flex_score,
              restwaarde_score, kosten_financiering, financieringsvorm,
              btw_methode, btw_tarief, eigen_bijdrage_maand, laadpaal_jaarkost,
              laadstroom_jaar, start_contract, einde_contract)
  on public.vehicles to authenticated;

grant update (titel, vehicle_ids, resultaten, aanbeveling, notitie)
  on public.evaluations to authenticated;

grant update (email, rol, vervalt_op, aanvaard_op)
  on public.uitnodigingen to authenticated;
