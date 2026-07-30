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

# Woorden die verraden dat een foto niet toont wat wij nodig hebben: een
# driekwartaanzicht van de hele wagen.
STRAFWOORDEN = {
    "interior": 40, "interieur": 40, "innenraum": 40, "dashboard": 40, "cockpit": 40,
    "rear": 25, "heck": 25, "achterzijde": 25, "back": 12, "tail": 18,
    "engine": 40, "motor": 20, "moteur": 20, "chassis": 30, "cutaway": 40,
    "wheel": 30, "rim": 30, "badge": 40, "logo": 45, "emblem": 45, "grille": 25,
    "seat": 30, "trunk": 25, "boot": 20, "charging": 15, "laadpaal": 20,
    "crash": 45, "damaged": 45, "wreck": 45, "police": 35, "polizei": 35,
    "taxi": 30, "camouflage": 45, "prototype": 30, "spy": 35, "concept": 25,
    "rally": 35, "race": 30, "racing": 30, "tuning": 30, "modified": 25,
    "museum": 15, "toy": 45, "model car": 45, "miniature": 45, "diorama": 45,
}

# Woorden die er net op wijzen dat het wél de foto is die we zoeken.
BONUSWOORDEN = {"front": 12, "vorderansicht": 12, "genf": 6, "iaa": 6, "salon": 5, "msp": 4}


def normaliseer(tekst: str) -> str:
    """Kleine letters zonder accenten of leestekens: 'Škoda Enyaq' -> 'skoda enyaq'."""
    plat = unicodedata.normalize("NFKD", tekst)
    plat = "".join(t for t in plat if not unicodedata.combining(t))
    return re.sub(r"[^a-z0-9]+", " ", plat.lower()).strip()


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
        return [
            f"{self.merk} {self.model}",
            f"{merk} {self.model}",
            f"{self.merk} {self.model} {self.modeljaar}",
        ]

    @property
    def kernwoorden(self) -> list[str]:
        return [w for w in normaliseer(self.model).split() if w]


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
    vraag = {
        "action": "query",
        "format": "json",
        "formatversion": "2",
        "generator": "search",
        "gsrsearch": term,
        "gsrnamespace": "6",
        "gsrlimit": "40",
        "prop": "imageinfo",
        "iiprop": "url|size|mime|extmetadata",
        "iiurlwidth": "1600",
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

    # De naam moet er echt in staan, anders krijgt een 'Volkswagen' willekeurig
    # welke Volkswagen mee.
    merkwoorden = normaliseer(model.merk).split()
    if not any(woord in titel for woord in merkwoorden):
        return None
    kern = model.kernwoorden
    treffers = sum(1 for woord in kern if woord in titel)
    if kern and treffers == 0:
        return None

    score = 40 * treffers + (12 if treffers == len(kern) else 0)
    reden = [f"{treffers}/{len(kern)} modelwoorden"]

    for woord, straf in STRAFWOORDEN.items():
        if woord in titel:
            score -= straf
            reden.append(f"-{straf} {woord}")
    for woord, bonus in BONUSWOORDEN.items():
        if woord in titel:
            score += bonus

    # Liefst een liggende foto rond 3:2, en liever groot dan klein.
    score += int(20 - min(20, abs(verhouding - 1.55) * 25))
    score += min(15, breedte // 400)

    jaar = re.findall(r"\b(20\d{2})\b", titel)
    if jaar and max(int(j) for j in jaar) >= model.modeljaar - 2:
        score += 8

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


def kies(model: Model) -> Kandidaat | None:
    gezien: set[str] = set()
    besten: list[Kandidaat] = []
    for term in model.zoektermen:
        for pagina in zoek(term):
            if pagina.get("title") in gezien:
                continue
            gezien.add(pagina.get("title", ""))
            kandidaat = beoordeel(pagina, model)
            if kandidaat:
                besten.append(kandidaat)
        if besten and max(k.score for k in besten) >= 70:
            break  # goed genoeg; geen extra verzoeken naar Commons
    if not besten:
        return None
    return max(besten, key=lambda k: k.score)


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

    print(f"{len(werk)} model(len) te doen\n")
    bronnen = lees_bronnen()
    gelukt, mislukt = 0, []

    for teller, model in enumerate(werk, start=1):
        prefix = f"[{teller:3}/{len(werk)}] {model.slug:32}"
        # Commons vraagt om terughoudend gebruik. Honderdvijftig modellen zijn
        # een paar honderd verzoeken; een halve seconde ertussen kost drie
        # minuten en houdt ons ruim binnen wat de API verwacht.
        if teller > 1:
            time.sleep(0.5)
        try:
            keuze = kies(model)
        except RuntimeError as fout:
            print(f"{prefix} netwerkfout: {fout}")
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
            snij_bij(haal(keuze.thumburl, binair=True), FOTOMAP / bestandsnaam)
        except RuntimeError as fout:
            print(f"{prefix} downloaden mislukt: {fout}")
            mislukt.append(model)
            continue

        bronnen[bestandsnaam] = {
            "auteur": keuze.auteur,
            "licentie": keuze.licentie,
            "titel": keuze.titel.replace("File:", ""),
            "bron": keuze.beschrijfurl,
        }
        zet_foto_in_catalogus(model.slug, f"/cars/{bestandsnaam}")
        schrijf_bronnen(bronnen)
        gelukt += 1

    print(f"\n{gelukt} foto's opgehaald, {len(mislukt)} niet gelukt")
    for model in mislukt:
        print(f"  {model.slug:32} {model.naam}")
    return 0 if not mislukt else 1


if __name__ == "__main__":
    sys.exit(main())
