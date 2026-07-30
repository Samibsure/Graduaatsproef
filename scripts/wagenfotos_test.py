#!/usr/bin/env python3
"""Tests voor de keuzeregels van wagenfotos.py.

    python3 scripts/wagenfotos_test.py

Waarom deze tests bestaan: de eerste volledige run koos voor negentien modellen
een foto die er niet hoorde. Niet door een fout in de code, maar doordat de
regels te grof waren. Elk geval hieronder is zo'n misser, met de titel en de
categorieën zoals Commons ze werkelijk teruggaf. Ze staan hier zodat een
volgende verfijning ze niet stilletjes weer binnenlaat.

Geen vitest: dit is een hulpscript in Python, niet de applicatie. De workflow
`.github/workflows/modelfotos.yml` draait dit voordat hij foto's ophaalt.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from wagenfotos import Model, beoordeel, jaartallen, licentie_deugt  # noqa: E402


def pagina(titel: str, categorieen: tuple[str, ...] = (), breedte: int = 1600,
           hoogte: int = 1000, licentie: str = "CC BY-SA 4.0",
           beschrijving: str = "") -> dict:
    return {
        "title": titel,
        "categories": [{"title": f"Category:{c}"} for c in categorieen],
        "imageinfo": [{
            "thumburl": "https://upload.wikimedia.org/x.jpg",
            "mime": "image/jpeg",
            "width": breedte,
            "hoogte": hoogte,
            "height": hoogte,
            "descriptionurl": "https://commons.wikimedia.org/wiki/File:x.jpg",
            "extmetadata": {
                "LicenseShortName": {"value": licentie},
                "Artist": {"value": "Iemand"},
                "ImageDescription": {"value": beschrijving},
            },
        }],
    }


def model(merk: str, naam: str, modeljaar: int = 2026) -> Model:
    return Model(slug="x", merk=merk, model=naam, uitvoering=None,
                 modeljaar=modeljaar, regel=1, foto=None)


# (beschrijving, pagina, model, mag deze foto gebruikt worden?)
GEVALLEN = [
    # Wat er op de foto staat, staat niet altijd in de bestandsnaam. De categorie
    # verraadt het wel; zonder die toets werd dit een dashboard op de kaart.
    ("interieur, onschuldige bestandsnaam",
     pagina("File:Ford Explorer EV IAA 2023 1X7A0592.jpg", ("Interiors of Ford Explorer",)),
     model("Ford", "Explorer"), False),
    ("closeup van de grille",
     pagina("File:2025 Ford Kuga grille detail.jpg"), model("Ford", "Kuga"), False),

    # Twee wagens op één foto: welke is de onze?
    ("twee wagens naast elkaar",
     pagina("File:Mercedes-Benz SLS AMG (C 197) & Mercedes-Benz 300 SL (W 198) Frontansicht.jpg"),
     model("Mercedes-Benz", "C 300 e"), False),

    # Een motorversie is geen eigen model: de C-Klasse mag, de 300 SL niet.
    ("de juiste C-Klasse op motorcode",
     pagina("File:Mercedes-Benz C 300 e AMG Line (W206, 2025).jpg"),
     model("Mercedes-Benz", "C 300 e"), True),
    ("de C-Klasse via de familienaam",
     pagina("File:Mercedes-Benz C-Class W206 2024.jpg"),
     model("Mercedes-Benz", "C 300 e"), True),
    ("de 5-reeks via de familienaam",
     pagina("File:BMW 5er G60 2024.jpg"), model("BMW", "530e"), True),

    # De juiste generatie. Het oudste jaartal beslist: in de bestandsnaam stond
    # de opnamedatum 2024, in de categorie het bouwjaar 1999.
    ("vorige generatie, herkend aan de categorie",
     pagina("File:BMW X5 E53 facelift Sanming 02 2024-01-13.jpg", ("BMW E53 (1999)",)),
     model("BMW", "X5"), False),
    ("BMW E-chassiscode zonder bouwjaar",
     pagina("File:BMW X5 E53 Sanming 02.jpg"), model("BMW", "X5"), False),
    ("BMW G-chassiscode mag wel",
     pagina("File:BMW X5 G05 2024.jpg"), model("BMW", "X5"), True),
    ("een e-code van een ander merk is geen chassiscode",
     pagina("File:Peugeot e-208 GT 2024.jpg"), model("Peugeot", "e-208"), True),

    ("vorige generatie in de titel",
     pagina("File:Toyota Prius XW20 2004.jpg"), model("Toyota", "Prius"), False),

    # Een carrosserievariant is een andere wagen, in beide richtingen.
    ("Touring hoort niet bij de gewone i5",
     pagina("File:PIMS 2024 - BMW i5 M60 Touring (front).jpg"), model("BMW", "i5"), False),
    ("Touring hoort wel bij de i5 Touring",
     pagina("File:PIMS 2024 - BMW i5 M60 Touring (front).jpg"),
     model("BMW", "i5 Touring"), True),

    # Cijfers onderscheiden de modellen, dus ze moeten als heel woord kloppen.
    ("de ID.4 mag niet doorgaan voor de ID.7",
     pagina("File:Volkswagen ID.4 2021.jpg"), model("Volkswagen", "ID.7"), False),
    ("een cameranummer is geen bouwjaar",
     pagina("File:Volkswagen ID.7 Tourer DSC 1996.jpg"),
     model("Volkswagen", "ID.7 Tourer"), True),

    # Niet zoals een bedrijf de wagen koopt.
    ("politiewagen", pagina("File:Skoda Octavia Combi Polizei Wien.jpg"),
     model("Škoda", "Octavia Combi"), False),
    ("safety car met reclamelivery",
     pagina("File:Porsche Taycan Safety Car Formula E.jpg"), model("Porsche", "Taycan"), False),

    # Licentie.
    ("NC-licentie mag niet op een publieke site",
     pagina("File:Kia EV9 2024.jpg", licentie="CC BY-NC-SA 2.0"), model("Kia", "EV9"), False),

    # En de gewone gang van zaken.
    ("een goede foto gaat door",
     pagina("File:Volkswagen ID.7 GTX IAA 2025 DSC 1796.jpg", ("Volkswagen ID.7",)),
     model("Volkswagen", "ID.7"), True),
    # 'toy' stond op de verbodslijst, en die woorden worden vanaf een woordgrens
    # vergeleken. Gevolg: alle tien Toyota's in de catalogus werden geweigerd.
    ("een Toyota is geen speelgoed",
     pagina("File:Toyota Corolla E210 2023 IMG 4711.jpg", ("Toyota Corolla (E210)",)),
     model("Toyota", "Corolla"), True),
    ("echt speelgoed blijft geweigerd",
     pagina("File:Toy Toyota Corolla 2023.jpg", ("Toy cars",)),
     model("Toyota", "Corolla"), False),

    # De beschrijving zegt soms wat de bestandsnaam verzwijgt.
    ("interieur, alleen in de beschrijving",
     pagina("File:Volvo ES90 DSC 6727.jpg", beschrijving="Innenraum des Volvo ES90"),
     model("Volvo", "ES90"), False),
    ("een bouwjaar in de beschrijving keurt niets af",
     pagina("File:Volvo ES90 2025.jpg",
            beschrijving="De ES90, opvolger van de S90 uit 2016"),
     model("Volvo", "ES90"), True),

    # Een modelnaam kan zelf een jaartal lijken.
    ("de e-2008 is geen wagen uit 2008",
     pagina("File:Peugeot e-2008 II 2024.jpg"), model("Peugeot", "e-2008"), True),

    ("staande foto is te smal na bijsnijden",
     pagina("File:Kia EV9 2025.jpg", breedte=900, hoogte=1400), model("Kia", "EV9"), False),
]

LICENTIES = {
    "CC BY-SA 4.0": True, "CC BY 2.0": True, "CC0": True, "Public domain": True,
    "PD-old": True, "PD-US": True, "Attribution": True, "cc-by-sa-4.0": True,
    "CC BY-NC-SA 2.0": False, "CC BY-ND 4.0": False, "Fair use": False,
    "non-free": False, "GFDL": False, "All rights reserved (copyright)": False,
}


def main() -> int:
    fouten = 0

    for beschrijving, kandidaat, wagen, verwacht in GEVALLEN:
        gekregen = beoordeel(kandidaat, wagen) is not None
        if gekregen != verwacht:
            fouten += 1
            print(f"FOUT  {beschrijving}: door={gekregen}, verwacht={verwacht}")

    for licentie, verwacht in LICENTIES.items():
        gekregen = licentie_deugt(licentie)
        if gekregen != verwacht:
            fouten += 1
            print(f"FOUT  licentie {licentie!r}: door={gekregen}, verwacht={verwacht}")

    if jaartallen("bmw x5 e53 dsc 1996 2024") != [2024]:
        fouten += 1
        print("FOUT  jaartallen(): een cameranummer mag geen bouwjaar worden")

    aantal = len(GEVALLEN) + len(LICENTIES) + 1
    if fouten:
        print(f"\n{fouten} van {aantal} tests gefaald")
        return 1
    print(f"{aantal} tests geslaagd")
    return 0


if __name__ == "__main__":
    sys.exit(main())
