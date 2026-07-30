#!/usr/bin/env python3
"""Haalt voor elk model uit de ingebouwde catalogus een modelfoto op.

Waarom een script en geen handwerk? De catalogus telt 163 modellen. Foto's er
één voor één bij zoeken is niet te herhalen, niet na te kijken en niet terug te
draaien: precies de reden waarom de catalogus zelf uit de databank naar de
broncode is verhuisd. Dit script maakt de foto's op dezelfde manier
reproduceerbaar. Wie een model toevoegt, draait het opnieuw en krijgt er een
foto, een bronvermelding en een regel in `catalogusdata.ts` bij.

Bron: Wikimedia Commons. Alleen bestanden onder een licentie die hergebruik
toelaat (publiek domein, CC0, CC BY, CC BY-SA) worden aanvaard; NC- en
ND-licenties niet, want de applicatie is publiek toegankelijk. Elke gekozen foto
komt met auteur, licentie en bronlink in `public/cars/BRONNEN.md` te staan.
Dat bestand is de naleving van de naamsvermelding; verwijder het niet.

Gebruik:

    python3 scripts/wagenfotos.py --check          # wat ontbreekt er? (offline)
    python3 scripts/wagenfotos.py                  # ontbrekende foto's ophalen
    python3 scripts/wagenfotos.py --only bmw-i5    # één model opnieuw
    python3 scripts/wagenfotos.py --force          # alles opnieuw ophalen

Vereist netwerktoegang tot commons.wikimedia.org en upload.wikimedia.org, en
Pillow (`pip install pillow`).
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import time
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import urlencode

WORTEL = Path(__file__).resolve().parent.parent
CATALOGUS = WORTEL / "src/lib/fiscaal/catalogusdata.ts"
FOTOMAP = WORTEL / "public/cars"
BRONNEN = FOTOMAP / "BRONNEN.md"

API = "https://commons.wikimedia.org/w/api.php"
AGENT = "Autofiscaliteit-catalogusfotos/1.0 (https://autofiscaliteit.com)"

# De kaart in de catalogus is 16:10; alles wordt daarop bijgesneden zodat de
# rasters niet gaan schokken van de ene verhouding naar de andere.
BREEDTE, HOOGTE = 960, 600

# Licenties die hergebruik op een publieke site toelaten. De sleutel is het
# begin van LicenseShortName zoals Commons het teruggeeft.
GOEDE_LICENTIES = ("cc0", "cc by", "public domain", "pd ", "attribution")
SLECHTE_LICENTIES = ("nc", "nd", "fair use", "non-free")

# Wat een foto onbruikbaar maakt, hoe onschuldig de bestandsnaam ook klinkt.
# Deze woorden worden getoetst op de titel én op de categorieën van het bestand.
# Geen straf maar een weigering: een interieur of een politiewagen wordt nooit
# beter dan een andere kandidaat, dus een strafpunt laat hem alsnog winnen
# wanneer de rest zwak is. Dat is in de eerste ronde precies gebeurd.
VERBODEN = (
    # niet de hele wagen
    "interior", "interieur", "innenraum", "innenansicht", "dashboard", "cockpit",
    "instrument", "steering", "lenkrad", "armaturenbrett", "engine", "motorraum",
    "wheel", "rim", "tyre", "tire", "badge", "emblem", "logo", "grille", "headlamp",
    "headlight", "taillight", "rucklicht", "trunk", "boot lid", "detail",
    "cutaway", "chassis", "underbody",
    # de wagen, maar niet zoals een bedrijf hem koopt
    "police", "polizei", "politie", "carabinieri", "gendarmerie", "ambulance",
    "feuerwehr", "fire brigade", "taxi", "driving school", "safety car", "race",
    "racing", "rally", "motorsport", "livery", "tuning", "camouflage", "wrapped",
    "crash", "damaged", "wreck", "burnt", "abandoned", "rust",
    # helemaal geen wagen
    "model car", "miniature", "diorama", "scale model", "lego",
)

# Woorden die alleen als héél woord verboden zijn. 'toy' stond eerst gewoon in de
# lijst hierboven, en die woorden worden vanaf een woordgrens vergeleken zodat een
# meervoud als 'Interiors of ...' ook aanslaat. Gevolg: 'toy' sloeg aan op
# **Toyota**, en alle tien Toyota's in de catalogus werden geweigerd.
VERBODEN_WOORDEN = ("toy", "toys", "replica", "concept")

# Woorden die er net op wijzen dat het de foto is die we zoeken: een
# driekwartaanzicht van de hele wagen.
BONUSWOORDEN = {
    "three quarter": 18, "front quarter": 18, "quarter view": 14,
    "vorderansicht": 8, "schragansicht": 8,
    "iaa": 6, "genf": 6, "gims": 6, "salon": 5, "automesse": 5, "mobility show": 5,
}

# Carrosseriewoorden. Staat er zo'n woord in de titel dat niet in de modelnaam
# staat, dan is het een andere uitvoering: een i5 Touring is geen i5, en een
# Superb Combi geen Superb. Omgekeerd hoort het woord er wel in te staan wanneer
# de modelnaam het draagt.
# 'van' en 'sw' staan er bewust niet in: die botsen op gewone woorden in
# Nederlandse en Duitse bestandsnamen ("vooraanzicht van een ...").
CARROSSERIEWOORDEN = (
    "touring", "tourer", "combi", "kombi", "estate", "avant", "sportback",
    "shooting brake", "coupe", "cabriolet", "convertible", "roadster", "variant",
    "allroad", "cross country", "pickup",
)

# Modelnamen die eigenlijk een motorversie zijn: 'C 300 e' is een uitvoering van
# de C-Klasse, '530e' een van de 5-reeks. Commons kent de motorcode niet altijd,
# de familie wel, en de wagen ziet er hetzelfde uit. Dus eerst de code proberen
# en anders terugvallen op de familie.
MOTORCODE_MERCEDES = re.compile(r"^([a-z]{1,3}) (\d{3}) ?([a-z]{0,2})$")
MOTORCODE_BMW = re.compile(r"^(\d)(\d\d)([a-z]?)$")


def normaliseer(tekst: str) -> str:
    """Kleine letters zonder accenten of leestekens: 'Škoda Enyaq' -> 'skoda enyaq'."""
    plat = unicodedata.normalize("NFKD", tekst)
    plat = "".join(t for t in plat if not unicodedata.combining(t))
    return re.sub(r"[^a-z0-9]+", " ", plat.lower()).strip()


CAMERAVOORVOEGSELS = {"dsc", "dscf", "dscn", "img", "imgp", "dsc00", "p", "pxl", "sam", "cimg"}


def jaartallen(tekst: str, negeer: set[str] | None = None) -> list[int]:
    """De jaartallen in een genormaliseerde tekst, zonder wat geen bouwjaar is.

    Twee soorten valse jaartallen. Fotografen noemen hun bestanden 'DSC 1996.jpg'
    en 'IMG 2019.jpg', dus een getal dat op een cameravoorvoegsel volgt telt niet
    mee. En een modelnaam kan zelf een jaartal lijken: de Peugeot e-2008 werd zo
    voor een wagen uit 2008 gehouden en om zijn ouderdom geweigerd. Wat in de
    naam van het model staat, hoort dus in `negeer`.
    """
    woorden = tekst.split()
    jaren = []
    for index, woord in enumerate(woorden):
        if not re.fullmatch(r"19\d{2}|20\d{2}", woord):
            continue
        if index and woorden[index - 1] in CAMERAVOORVOEGSELS:
            continue
        if negeer and woord in negeer:
            continue
        jaren.append(int(woord))
    return jaren


def bevat(tekst: str, woordgroep: str) -> bool:
    """Staat deze woordgroep als hele woorden in de tekst?

    Met een gewone `in`-toets zou de 7 van de ID.7 ook aanslaan op het jaartal
    2017, en 'combi' op 'combination'. Beide teksten zijn al genormaliseerd, dus
    één spatie eromheen volstaat als woordgrens.
    """
    return f" {woordgroep} " in f" {tekst} "


@dataclass
class Model:
    slug: str
    merk: str
    model: str
    uitvoering: str | None
    modeljaar: int
    regel: int
    foto: str | None

    @property
    def naam(self) -> str:
        return f"{self.merk} {self.model}"

    @property
    def zoektermen(self) -> list[str]:
        """Van specifiek naar algemeen: stopt bij de eerste die iets bruikbaars geeft."""
        merk = self.merk.replace("-Benz", "")  # Commons noemt ze meestal 'Mercedes-Benz'
        termen = [f"{self.merk} {self.model}", f"{merk} {self.model}"]
        for eis in self.eisen[1:]:
            termen.append(f"{self.merk} {' '.join(eis)}")
        termen.append(f"{self.merk} {self.model} {self.modeljaar}")
        return termen

    @property
    def eisen(self) -> list[list[str]]:
        """Woordgroepen die in de bestandsnaam moeten staan, in volgorde van voorkeur.

        Eén ervan moet volledig kloppen. Cijfers van één teken blijven staan (de
        7 van ID.7 onderscheidt hem van de ID.4), losse letters niet: die maken
        van 'C 300 e' een treffer op elke titel met een c en een e in.
        """
        naam = normaliseer(self.model)

        mercedes = MOTORCODE_MERCEDES.match(naam)
        if mercedes:
            letters, cijfers, _ = mercedes.groups()
            return [[f"{letters} {cijfers}"], [f"{letters} class"], [f"{letters} klasse"]]

        bmw = MOTORCODE_BMW.match(naam)
        if bmw:
            reeks = bmw.group(1)
            return [[naam], [f"{reeks} series"], [f"{reeks}er"], [f"{reeks} serie"]]

        woorden = [w for w in naam.split() if len(w) > 1 or w.isdigit()]
        return [woorden or [naam]]


@dataclass
class Kandidaat:
    titel: str
    thumburl: str
    breedte: int
    hoogte: int
    beschrijfurl: str
    auteur: str
    licentie: str
    licentieurl: str
    score: int = 0
    reden: list[str] = field(default_factory=list)


def lees_modellen() -> list[Model]:
    """Haalt slug, merk, model en de bestaande foto uit catalogusdata.ts.

    Bewust geen TypeScript uitvoeren: het bestand is één lijst met letterlijke
    objecten, dus een regel-voor-regel lezing volstaat en houdt dit script
    onafhankelijk van de bundel.
    """
    modellen: list[Model] = []
    for nummer, regel in enumerate(CATALOGUS.read_text(encoding="utf-8").splitlines(), start=1):
        if not re.match(r"^\s*(bev|phev|hev|fossiel)\(\{", regel):
            continue

        def veld(naam: str) -> str | None:
            gevonden = re.search(rf'\b{naam}: "([^"]*)"', regel)
            return gevonden.group(1) if gevonden else None

        jaar = re.search(r"\bjaar: (\d{4})", regel)
        slug = veld("slug")
        merk = veld("merk")
        model = veld("model")
        if not (slug and merk and model):
            raise SystemExit(f"regel {nummer}: slug, merk of model ontbreekt")
        modellen.append(
            Model(
                slug=slug,
                merk=merk,
                model=model,
                uitvoering=veld("uitv"),
                modeljaar=int(jaar.group(1)) if jaar else 2026,
                regel=nummer,
                foto=veld("foto"),
            )
        )
    return modellen


def haal(url: str) -> bytes:
    """Eén GET via curl, zodat de proxy- en CA-instellingen van de omgeving gelden."""
    opdracht = [
        "curl", "-sS", "--fail", "--location", "--max-time", "60",
        "--retry", "3", "--retry-delay", "2",
        "-H", f"User-Agent: {AGENT}",
        url,
    ]
    klaar = subprocess.run(opdracht, capture_output=True)
    if klaar.returncode != 0:
        melding = klaar.stderr.decode("utf-8", "replace").strip()
        raise RuntimeError(f"ophalen mislukt ({url}): {melding}")
    return klaar.stdout


def zoek(term: str) -> list[dict]:
    """Zoekt bestanden op Commons, met hun categorieën erbij.

    Die categorieën zijn geen luxe. De eerste ronde koos voor de Ford Explorer,
    de Hyundai Inster en de Leapmotor C10 een foto van het *interieur*, en aan de
    bestandsnaam was dat niet te zien: 'Ford Explorer EV IAA 2023 1X7A0592.jpg'
    zegt niets over wat er op staat. De fotograaf hangt zo'n opname wel in een
    categorie als 'Interior of ...'. Daar valt het dus wel op te vangen.
    """
    vraag = {
        "action": "query",
        "format": "json",
        "formatversion": "2",
        "generator": "search",
        "gsrsearch": term,
        "gsrnamespace": "6",
        "gsrlimit": "40",
        "prop": "imageinfo|categories",
        "iiprop": "url|size|mime|extmetadata",
        "iiurlwidth": "1600",
        "cllimit": "max",
        "clshow": "!hidden",
    }
    antwoord = json.loads(haal(f"{API}?{urlencode(vraag)}").decode("utf-8"))
    return antwoord.get("query", {}).get("pages", []) or []


def tekst_uit(meta: dict, sleutel: str) -> str:
    waarde = (meta.get(sleutel) or {}).get("value", "")
    zonder_opmaak = re.sub(r"<[^>]+>", " ", str(waarde))
    return re.sub(r"\s+", " ", zonder_opmaak).strip()


def licentie_deugt(licentie: str) -> bool:
    """Mag deze foto op een publieke site staan?

    Eerst weigeren, dan pas toelaten. Anders glipt 'CC BY-NC-SA 4.0' erdoor op
    het stuk 'CC BY': net de licentie die commercieel gebruik verbiedt, en de
    applicatie is publiek toegankelijk. 'CC BY-SA' moet er wél door, dus de
    weigering kijkt naar 'nc' en 'nd' als apart deel, niet als letters.
    """
    laag = re.sub(r"[\s_]+", " ", licentie.lower().strip())
    if re.search(r"(?:^|[\s-])(nc|nd)(?:[\s-]|$)|non ?free|fair use|copyright", laag):
        return False
    genormaliseerd = laag.replace("-", " ")
    return any(genormaliseerd.startswith(goed) or goed in genormaliseerd for goed in GOEDE_LICENTIES)


def beoordeel(pagina: dict, model: Model) -> Kandidaat | None:
    info = (pagina.get("imageinfo") or [{}])[0]
    if not info or not info.get("thumburl"):
        return None
    if info.get("mime") not in ("image/jpeg", "image/png"):
        return None

    breedte, hoogte = info.get("width", 0), info.get("height", 0)
    if breedte < 900 or hoogte < 450:
        return None
    verhouding = breedte / hoogte if hoogte else 0
    if not 1.15 <= verhouding <= 2.4:
        return None  # portret of panorama: na bijsnijden blijft er te weinig wagen over

    meta = info.get("extmetadata") or {}
    licentie = tekst_uit(meta, "LicenseShortName") or tekst_uit(meta, "License")
    if not licentie_deugt(licentie):
        return None

    titel = normaliseer(pagina.get("title", ""))
    if not titel:
        return None

    # De titel zegt welke wagen het is, de categorieën zeggen wat er op staat.
    # Voor de weigeringen tellen ze samen, voor de naamherkenning alleen de titel.
    categorieen = normaliseer(
        " ".join(c.get("title", "") for c in (pagina.get("categories") or []))
    )
    alles = f"{titel} {categorieen}"

    # Aan het begin van een woord, niet ergens middenin: zo slaat 'wheel' ook aan
    # op 'wheels' en 'interior' op 'Interiors of ...', zoals categorieën heten,
    # zonder dat 'race' een treffer wordt op 'Terrace'.
    if any(re.search(rf"\b{re.escape(verboden)}", alles) for verboden in VERBODEN):
        return None
    if any(bevat(alles, verboden) for verboden in VERBODEN_WOORDEN):
        return None

    # Twee wagens op één foto: welke van de twee is de onze? Zo koos de eerste
    # ronde voor de Mercedes C 300 e een foto van een SLS AMG naast een 300 SL.
    if "&" in pagina.get("title", "") or " und " in titel:
        return None

    # De naam moet er echt in staan, anders krijgt een 'Volkswagen' willekeurig
    # welke Volkswagen mee.
    merkwoorden = normaliseer(model.merk).split()
    if not any(woord in titel for woord in merkwoorden):
        return None

    # Alle woorden van één eis, niet een deel ervan. Met 'een van de woorden'
    # volstaat 'ID.7' voor de ID.7 Tourer en omgekeerd, en dan tonen twee rijen
    # in de catalogus dezelfde wagen.
    gekozen_eis = next((eis for eis in model.eisen if all(bevat(titel, t) for t in eis)), None)
    if gekozen_eis is None:
        return None

    # Een carrosserievariant is een andere wagen.
    for woord in CARROSSERIEWOORDEN:
        in_model = bevat(normaliseer(model.model), woord)
        if bevat(titel, woord) != in_model:
            return None

    score = 60
    reden = [" ".join(gekozen_eis)]

    for woord, bonus in BONUSWOORDEN.items():
        if woord in alles:
            score += bonus

    # Liefst een liggende foto rond 3:2, en liever groot dan klein.
    score += int(20 - min(20, abs(verhouding - 1.55) * 25))
    score += min(15, breedte // 400)

    # De juiste generatie. Het *oudste* jaartal beslist, niet het jongste: bij de
    # BMW X5 stond in de bestandsnaam de opnamedatum 2024 en in de categorie het
    # bouwjaar 1999, en zo raakte een X5 E53 op de plaats van de X5 50e. Het
    # jongste jaartal zei daar niets, het oudste alles.
    # BMW noemt zijn generaties bij chassiscode, en die code staat vaak in de
    # bestandsnaam terwijl er geen bouwjaar bij staat. Elke E-code is van voor
    # 2010: zo bleef 'BMW X5 E53' opduiken voor de X5 50e van 2026, ook nadat de
    # jaartaltoets er was. De F- en G-codes blijven toegelaten.
    if normaliseer(model.merk) == "bmw" and re.search(r"\be\d{2}\b", alles):
        return None

    jaren = jaartallen(alles, negeer=set(normaliseer(model.model).split()))
    if jaren:
        if min(jaren) < model.modeljaar - 8:
            return None
        if max(jaren) >= model.modeljaar - 2:
            score += 10

    return Kandidaat(
        titel=pagina.get("title", ""),
        thumburl=info["thumburl"],
        breedte=breedte,
        hoogte=hoogte,
        beschrijfurl=info.get("descriptionurl", ""),
        auteur=tekst_uit(meta, "Artist") or "onbekend",
        licentie=licentie,
        licentieurl=tekst_uit(meta, "LicenseUrl"),
        score=score,
        reden=reden,
    )


def kies(model: Model, bezet: set[str], overslaan: int = 0) -> Kandidaat | None:
    """De beste kandidaat voor dit model, of None.

    `bezet` bevat de bestanden die al aan een ander model hangen. Twee rijen in
    de catalogus die dezelfde foto tonen, lezen als een fout in de applicatie,
    ook wanneer het om twee uitvoeringen van dezelfde wagen gaat.

    `overslaan` laat de zoveel beste over: de uitweg wanneer de eerste keuze
    ondanks alle regels niet deugt en er met de hand een andere moet komen.
    """
    gezien: set[str] = set()
    besten: list[Kandidaat] = []
    for term in model.zoektermen:
        for pagina in zoek(term):
            titel = pagina.get("title", "")
            if titel in gezien or bestandsnaam_van(titel) in bezet:
                continue
            gezien.add(titel)
            kandidaat = beoordeel(pagina, model)
            if kandidaat:
                besten.append(kandidaat)
        if len(besten) > overslaan and max(k.score for k in besten) >= 85:
            break  # goed genoeg; geen extra verzoeken naar Commons
    op_score = sorted(besten, key=lambda k: k.score, reverse=True)
    return op_score[overslaan] if len(op_score) > overslaan else None


def bestandsnaam_van(titel: str) -> str:
    """'File:BMW i5 M60.jpg' -> 'BMW i5 M60.jpg', zoals het in BRONNEN.md staat."""
    return titel.replace("File:", "").strip()


def snij_bij(rauw: bytes, doel: Path) -> None:
    """Schaalt en snijdt bij tot exact 960x600, zonder vervorming."""
    from io import BytesIO

    from PIL import Image

    beeld = Image.open(BytesIO(rauw))
    beeld = beeld.convert("RGB")

    doelverhouding = BREEDTE / HOOGTE
    breedte, hoogte = beeld.size
    if breedte / hoogte > doelverhouding:
        nieuw = int(hoogte * doelverhouding)
        links = (breedte - nieuw) // 2
        beeld = beeld.crop((links, 0, links + nieuw, hoogte))
    else:
        nieuw = int(breedte / doelverhouding)
        # Iets boven het midden: bij een straatfoto staat er onderaan vooral wegdek.
        boven = max(0, int((hoogte - nieuw) * 0.42))
        beeld = beeld.crop((0, boven, breedte, boven + nieuw))

    beeld = beeld.resize((BREEDTE, HOOGTE), Image.LANCZOS)
    doel.parent.mkdir(parents=True, exist_ok=True)
    beeld.save(doel, "JPEG", quality=82, optimize=True, progressive=True)


def schrijf_bronnen(rijen: dict[str, dict]) -> None:
    """Bronvermelding per foto. Bij CC BY(-SA) is dit geen beleefdheid maar de licentie."""
    regels = [
        "# Herkomst van de modelfoto's",
        "",
        "Elke foto in deze map komt van Wikimedia Commons en staat onder een licentie",
        "die hergebruik toelaat. Naamsvermelding hoort daarbij: die staat hieronder, per",
        "bestand, met de auteur, de licentie en de link naar de bronpagina.",
        "",
        "Deze lijst wordt geschreven door `scripts/wagenfotos.py`. Pas ze niet met de hand aan.",
        "",
        "| Bestand | Auteur | Licentie | Bron |",
        "| --- | --- | --- | --- |",
    ]
    for bestand in sorted(rijen):
        rij = rijen[bestand]
        auteur = rij["auteur"].replace("|", "/")
        licentie = rij["licentie"].replace("|", "/")
        regels.append(f"| `{bestand}` | {auteur} | {licentie} | [{rij['titel']}]({rij['bron']}) |")
    regels.append("")
    BRONNEN.write_text("\n".join(regels), encoding="utf-8")


def lees_bronnen() -> dict[str, dict]:
    """Leest de bestaande tabel terug, zodat een gedeeltelijke run niets wist."""
    if not BRONNEN.exists():
        return {}
    rijen: dict[str, dict] = {}
    for regel in BRONNEN.read_text(encoding="utf-8").splitlines():
        gevonden = re.match(r"^\| `([^`]+)` \| (.*?) \| (.*?) \| \[(.*?)\]\((.*?)\) \|$", regel)
        if gevonden:
            bestand, auteur, licentie, titel, bron = gevonden.groups()
            rijen[bestand] = {"auteur": auteur, "licentie": licentie, "titel": titel, "bron": bron}
    return rijen


def zet_foto_in_catalogus(slug: str, pad: str) -> None:
    """Voegt `foto: "..."` toe aan de regel van dit model, of werkt ze bij."""
    tekst = CATALOGUS.read_text(encoding="utf-8")
    regels = tekst.splitlines(keepends=True)
    for index, regel in enumerate(regels):
        if f'slug: "{slug}"' not in regel:
            continue
        if 'foto: "' in regel:
            regels[index] = re.sub(r'foto: "[^"]*"', f'foto: "{pad}"', regel)
        else:
            # Achteraan, net voor het sluitende `})`, zodat de kolomvolgorde
            # overal dezelfde blijft.
            regels[index] = re.sub(r"\s*\}\),\s*$", f', foto: "{pad}" }}),\n', regel)
        CATALOGUS.write_text("".join(regels), encoding="utf-8")
        return
    raise SystemExit(f"slug {slug} niet teruggevonden in catalogusdata.ts")


def controleer(modellen: list[Model]) -> int:
    """Offline overzicht: wat ontbreekt, wat wijst nergens heen, wat is dubbel."""
    import hashlib

    ontbreekt = [m for m in modellen if not m.foto]
    kapot = [
        m for m in modellen
        if m.foto and not (WORTEL / "public" / m.foto.lstrip("/")).exists()
    ]

    # Twee modellen met exact hetzelfde bestand betekent dat één van beide de
    # verkeerde wagen toont. Het pad verschilt dan, dus alleen de inhoud verraadt het.
    per_som: dict[str, list[Model]] = {}
    for model in modellen:
        pad = WORTEL / "public" / (model.foto or "").lstrip("/")
        if model.foto and pad.exists():
            som = hashlib.md5(pad.read_bytes()).hexdigest()
            per_som.setdefault(som, []).append(model)
    dubbel = [groep for groep in per_som.values() if len(groep) > 1]

    print(f"{len(modellen)} modellen, {len(modellen) - len(ontbreekt)} met foto")
    if kapot:
        print(f"\n{len(kapot)} verwijzen naar een bestand dat er niet is:")
        for model in kapot:
            print(f"  {model.slug:32} -> {model.foto}")
    if dubbel:
        print(f"\n{len(dubbel)} keer dezelfde foto op meerdere modellen:")
        for groep in dubbel:
            print(f"  {', '.join(m.slug for m in groep)}")
    if ontbreekt:
        print(f"\n{len(ontbreekt)} zonder foto:")
        for model in ontbreekt:
            print(f"  {model.slug:32} {model.naam}")
    return 1 if (ontbreekt or kapot or dubbel) else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="alleen tonen wat ontbreekt")
    parser.add_argument("--force", action="store_true", help="ook modellen die al een foto hebben")
    parser.add_argument("--only", default="", help="komma-gescheiden slugs")
    parser.add_argument("--dry-run", action="store_true", help="zoeken en tonen, niets bewaren")
    parser.add_argument(
        "--alternatief",
        type=int,
        default=0,
        metavar="N",
        help="niet de beste kandidaat nemen maar de N-de daarna, voor een keuze die niet deugt",
    )
    argumenten = parser.parse_args()

    modellen = lees_modellen()
    if argumenten.check:
        return controleer(modellen)

    if argumenten.only:
        gevraagd = {s.strip() for s in argumenten.only.split(",") if s.strip()}
        werk = [m for m in modellen if m.slug in gevraagd]
        onbekend = gevraagd - {m.slug for m in werk}
        if onbekend:
            raise SystemExit(f"onbekende slug(s): {', '.join(sorted(onbekend))}")
    elif argumenten.force:
        werk = modellen
    else:
        werk = [m for m in modellen if not m.foto]

    # Een volledige verversing beslist opnieuw over alles, dus begint ze met een
    # leeg blad: de bezette bestanden worden binnen deze run opgebouwd. Een
    # gerichte herkansing (--only) doet het omgekeerde en houdt juist rekening
    # met wat er al hangt, inclusief de foto die nu vervangen moet worden.
    volledig = argumenten.force and not argumenten.only
    bronnen = {} if volledig else lees_bronnen()
    bezet = {rij["titel"] for rij in bronnen.values()}

    print(f"{len(werk)} model(len) te doen\n")
    gelukt, mislukt = 0, []

    for teller, model in enumerate(werk, start=1):
        prefix = f"[{teller:3}/{len(werk)}] {model.slug:32}"
        # Commons vraagt om terughoudend gebruik. Honderdvijftig modellen zijn
        # een paar honderd verzoeken; een halve seconde ertussen kost drie
        # minuten en houdt ons ruim binnen wat de API verwacht.
        if teller > 1:
            time.sleep(0.5)
        try:
            keuze = kies(model, bezet, argumenten.alternatief)
        except Exception as fout:  # noqa: BLE001 — zie de reden bij het downloaden
            print(f"{prefix} zoeken mislukt: {type(fout).__name__}: {fout}")
            mislukt.append(model)
            continue
        if not keuze:
            print(f"{prefix} geen bruikbare foto gevonden")
            mislukt.append(model)
            continue

        print(f"{prefix} {keuze.score:4}  {keuze.titel[:60]}")
        if argumenten.dry_run:
            continue

        bestandsnaam = f"{model.slug}.jpg"
        try:
            snij_bij(haal(keuze.thumburl), FOTOMAP / bestandsnaam)
        # Bewust breed. Eén model dat struikelt — een thumbnail die Pillow niet
        # leest, een verbinding die wegvalt — mag de honderdzevenendertig andere
        # niet meesleuren. Wat overblijft staat onderaan in de lijst 'niet gelukt'
        # en is met --only opnieuw te proberen.
        except Exception as fout:  # noqa: BLE001
            print(f"{prefix} downloaden mislukt: {type(fout).__name__}: {fout}")
            mislukt.append(model)
            continue

        bronnen[bestandsnaam] = {
            "auteur": keuze.auteur,
            "licentie": keuze.licentie,
            "titel": bestandsnaam_van(keuze.titel),
            "bron": keuze.beschrijfurl,
        }
        bezet.add(bestandsnaam_van(keuze.titel))
        zet_foto_in_catalogus(model.slug, f"/cars/{bestandsnaam}")
        schrijf_bronnen(bronnen)
        gelukt += 1

    print(f"\n{gelukt} foto's opgehaald, {len(mislukt)} niet gelukt")
    for model in mislukt:
        print(f"  {model.slug:32} {model.naam}")

    # Ook na een gerichte herkansing: zodra een model van bestandsnaam wisselt,
    # blijft de oude achter zonder dat iets er nog naar verwijst.
    if not argumenten.dry_run:
        ruim_op(lees_modellen(), bronnen)

    return 0 if not mislukt else 1


def ruim_op(modellen: list[Model], bronnen: dict[str, dict]) -> None:
    """Verwijdert foto's waar geen model meer naar verwijst.

    Na een volledige verversing heet elk bestand naar de slug van zijn model. De
    oorspronkelijke vijfentwintig heetten `01-tesla-model-y.jpg` en dergelijke;
    die zouden anders als weeskind in de map achterblijven, zonder bronvermelding
    en zonder dat iets ze nog toont.
    """
    gebruikt = {(m.foto or "").split("/")[-1] for m in modellen}
    verwijderd = []
    for bestand in sorted(FOTOMAP.glob("*.jpg")):
        if bestand.name not in gebruikt:
            bestand.unlink()
            bronnen.pop(bestand.name, None)
            verwijderd.append(bestand.name)
    if verwijderd:
        schrijf_bronnen(bronnen)
        print(f"\n{len(verwijderd)} ongebruikte bestanden verwijderd:")
        for naam in verwijderd:
            print(f"  {naam}")


if __name__ == "__main__":
    sys.exit(main())
