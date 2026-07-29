# Wagencatalogus

Deze lijst wordt gegenereerd uit `src/lib/fiscaal/catalogusdata.ts`. Bewerk dat bestand,
niet dit document: `npm test` vergelijkt beide en faalt wanneer ze uit elkaar lopen.

## Wat vaststaat en wat berekend wordt

De kolommen hieronder zijn **opgezochte** gegevens per model en modeljaar: cataloguswaarde,
CO₂ (WLTP), verbruik, actieradius, vermogen, koffervolume en trekgewicht. Ze komen uit publieke
fabrikants- en WLTP-gegevens voor de Belgische markt en zijn richtinggevend, niet contractueel:
uitrusting, opties en bandenmaat verschuiven zowel de cataloguswaarde als de CO₂, en prijzen
wijzigen. Controleer voor een echte beslissing altijd de offerte.

Alles wat daaruit **volgt**, rekent de applicatie zelf uit: energie, onderhoud, verzekering,
verkeersbelasting en afschrijving, en daarbovenop het voordeel van alle aard, de verworpen
uitgaven, de CO₂-solidariteitsbijdrage en de totale kost. Er staat nergens een ingetypte kostprijs.

## Geverifieerd (✔) of raming (~)

De eerste kolom zegt of de **fiscaal beslissende** velden van een rij tegen een genoemde bron
gelegd zijn: de cataloguswaarde bij een elektrische wagen (de CO₂ is daar per definitie 0) en de
CO₂ bij een plug-in hybride. Die twee bepalen het voordeel van alle aard, de verworpen uitgaven
en de CO₂-solidariteitsbijdrage.

Van de 163 rijen zijn er 9 geverifieerd. De rest is een raming: een plausibel
fabrikantscijfer dat niemand nagekeken heeft. Zulke cijfers hebben de goede orde van grootte,
maar horen niet als vaststaand op het scherm te komen — en daarom toont de catalogus in de app
standaard alleen de geverifieerde modellen, met een schakelaar om de ramingen erbij te zetten.

Ze blijven wél in de dataset staan in plaats van geschrapt te worden: promoveren is dan één bron
per regel in plaats van alle cijfers opnieuw opzoeken. Waar een bron een vork geeft, staat de
**hoogste** waarde in de data. Wie zich vergist, hoort zich naar de veilige kant te vergissen:
een hoger CO₂-cijfer betekent een hoger VAA, een hogere bijdrage en een grotere kans dat de
valse-hybridetoets kantelt.

## Restwaarde

De laatste kolom is de verwachte restwaarde na vier jaar, en die is **niet** per model bepaald.
Ze bestaat niet als publiek erkend Belgisch cijfer: Autovista en Eurotax publiceren op 36 maanden
en 60.000 km, op modelniveau achter een betaalmuur. De app rekent daarom met ranges per
aandrijftype (JD Power/Autovista24, Duitse markt, november 2025): hybride 49,8%, benzine 49,2%,
diesel 48%, plug-in 45,1% en elektrisch 37,6% na 36 maanden, meetkundig doorgerekend naar 48
maanden. Elke restwaarde hieronder is dus een schatting, en de rangorde is wat de bron robuust
noemt: hybride ≈ benzine ≈ diesel > plug-in > elektrisch.

## Wat er bewust niet in staat

Lichte vracht. Een bestelwagen die als lichte vracht is ingeschreven, valt buiten de
aftrekbeperking van artikel 66 WIB92. De rekenkern kent die uitzondering nog niet en zou er dus
een aftrekpercentage op plakken dat niet geldt. Zolang dat zo is, hoort een bestelwagen niet in
deze lijst.

## Overzicht

| Aandrijving | Aantal | Waarvan geverifieerd |
| --- | ---: | ---: |
| Elektrisch | 93 | 3 |
| Plug-in hybride | 35 | 6 |
| Hybride | 13 | 0 |
| Verbranding | 22 | 0 |
| **Totaal** | **163** | **9** |

## Elektrisch (93)

| ✔ | Merk | Model | Modeljaar | Segment | CO₂ | Verbruik/100 km | Actieradius | Vermogen | Koffer | Trekgewicht | Cataloguswaarde | Restwaarde 4j |
| :-: | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| ✔ | Tesla | Model Y Long Range AWD | 2026 | SUV middenklasse | 0 g | 15,9 kWh | 629 km | 274 kW | 854 l | 1.600 kg | € 53.990 | 27.1% |
| ~ | Tesla | Model 3 Long Range RWD | 2026 | Berline middenklasse | 0 g | 12,5 kWh | 702 km | 209 kW | 594 l | 1.000 kg | € 44.990 | 27.1% |
| ~ | Kia | EV3 Long Range | 2026 | SUV compact | 0 g | 14,9 kWh | 600 km | 150 kW | 460 l | 1.000 kg | € 42.290 | 27.1% |
| ~ | Škoda | Elroq 85 | 2026 | SUV compact | 0 g | 15,1 kWh | 581 km | 210 kW | 470 l | 1.200 kg | € 44.490 | 27.1% |
| ~ | BMW | iX1 eDrive20 | 2026 | SUV compact premium | 0 g | 15,5 kWh | 474 km | 150 kW | 490 l | 1.200 kg | € 48.950 | 27.1% |
| ~ | Škoda | Enyaq 85 | 2026 | SUV middenklasse | 0 g | 15,4 kWh | 581 km | 210 kW | 585 l | 1.400 kg | € 48.690 | 27.1% |
| ~ | Volvo | EX30 Extended Range | 2026 | SUV compact premium | 0 g | 15 kWh | 476 km | 200 kW | 318 l | 1.600 kg | € 41.990 | 27.1% |
| ✔ | Audi | Q4 e-tron 45 | 2026 | SUV middenklasse premium | 0 g | 15,8 kWh | 562 km | 210 kW | 520 l | 1.200 kg | € 57.900 | 27.1% |
| ~ | Volkswagen | ID.4 Pro | 2026 | SUV middenklasse | 0 g | 15,6 kWh | 573 km | 210 kW | 543 l | 1.200 kg | € 47.990 | 27.1% |
| ~ | Volkswagen | ID.3 Pro S | 2026 | Compacte hatchback | 0 g | 15 kWh | 559 km | 170 kW | 385 l | 0 kg | € 42.990 | 27.1% |
| ~ | Kia | EV6 Long Range RWD | 2026 | SUV middenklasse | 0 g | 15,7 kWh | 582 km | 168 kW | 490 l | 1.600 kg | € 49.990 | 27.1% |
| ~ | Volvo | EX40 Extended Range | 2026 | SUV compact premium | 0 g | 15,9 kWh | 573 km | 185 kW | 419 l | 1.800 kg | € 49.900 | 27.1% |
| ~ | Hyundai | Kona Electric 65 kWh | 2026 | SUV compact | 0 g | 14,7 kWh | 514 km | 160 kW | 466 l | 750 kg | € 41.490 | 27.1% |
| ~ | Renault | Mégane E-Tech EV60 | 2026 | Compacte hatchback | 0 g | 15,2 kWh | 470 km | 160 kW | 440 l | 900 kg | € 39.990 | 27.1% |
| ~ | Cupra | Born 58 kWh | 2026 | Compacte hatchback | 0 g | 15,3 kWh | 425 km | 170 kW | 385 l | 0 kg | € 40.990 | 27.1% |
| ~ | Mercedes-Benz | EQA 250+ | 2026 | SUV compact premium | 0 g | 15,1 kWh | 560 km | 140 kW | 340 l | 750 kg | € 52.400 | 27.1% |
| ~ | Peugeot | e-3008 73 kWh | 2026 | SUV middenklasse | 0 g | 15,9 kWh | 527 km | 157 kW | 520 l | 1.250 kg | € 46.850 | 27.1% |
| ✔ | BMW | i4 eDrive40 | 2026 | Berline premium | 0 g | 15,5 kWh | 590 km | 250 kW | 470 l | 1.600 kg | € 60.800 | 27.1% |
| ~ | Polestar | 2 Long Range Single Motor | 2026 | Berline middenklasse | 0 g | 14,5 kWh | 655 km | 220 kW | 405 l | 1.500 kg | € 51.500 | 27.1% |
| ~ | Volkswagen | ID.7 Pro S | 2026 | Berline hogere middenklasse | 0 g | 13,9 kWh | 702 km | 210 kW | 532 l | 1.200 kg | € 57.990 | 27.1% |
| ~ | Volkswagen | ID.7 Tourer Pro S | 2026 | Break hogere middenklasse | 0 g | 14,3 kWh | 685 km | 210 kW | 605 l | 1.200 kg | € 60.490 | 27.1% |
| ~ | Volkswagen | ID.5 Pro | 2026 | SUV coupé middenklasse | 0 g | 15,4 kWh | 566 km | 210 kW | 549 l | 1.200 kg | € 51.490 | 27.1% |
| ~ | Volkswagen | ID. Buzz Pro | 2026 | Ruimtewagen | 0 g | 19,8 kWh | 461 km | 210 kW | 1.121 l | 1.000 kg | € 58.990 | 27.1% |
| ~ | Škoda | Enyaq Coupé 85 | 2026 | SUV coupé middenklasse | 0 g | 15,1 kWh | 591 km | 210 kW | 570 l | 1.400 kg | € 50.990 | 27.1% |
| ~ | Audi | Q6 e-tron quattro | 2026 | SUV hogere middenklasse premium | 0 g | 17 kWh | 625 km | 285 kW | 526 l | 2.400 kg | € 74.900 | 27.1% |
| ~ | Audi | A6 e-tron performance | 2026 | Berline hogere middenklasse premium | 0 g | 14 kWh | 756 km | 270 kW | 502 l | 1.200 kg | € 72.900 | 27.1% |
| ~ | Audi | Q8 e-tron 55 quattro | 2026 | Grote SUV premium | 0 g | 20,8 kWh | 582 km | 300 kW | 569 l | 1.800 kg | € 85.900 | 27.1% |
| ~ | Cupra | Tavascan Endurance | 2026 | SUV coupé middenklasse | 0 g | 15,6 kWh | 568 km | 210 kW | 540 l | 1.200 kg | € 50.990 | 27.1% |
| ~ | BMW | iX2 eDrive20 | 2026 | SUV coupé compact premium | 0 g | 15,4 kWh | 478 km | 150 kW | 525 l | 1.200 kg | € 51.500 | 27.1% |
| ~ | BMW | iX3 50 xDrive | 2026 | SUV middenklasse premium | 0 g | 15,1 kWh | 805 km | 345 kW | 520 l | 2.000 kg | € 72.900 | 27.1% |
| ~ | BMW | i5 eDrive40 | 2026 | Berline hogere middenklasse premium | 0 g | 15,9 kWh | 582 km | 250 kW | 490 l | 1.500 kg | € 76.500 | 27.1% |
| ~ | BMW | i5 Touring eDrive40 | 2026 | Break hogere middenklasse premium | 0 g | 16,5 kWh | 560 km | 250 kW | 570 l | 2.000 kg | € 79.500 | 27.1% |
| ~ | BMW | iX xDrive45 | 2026 | Grote SUV premium | 0 g | 17,5 kWh | 602 km | 300 kW | 500 l | 2.500 kg | € 89.900 | 27.1% |
| ~ | Mercedes-Benz | EQB 250+ | 2026 | SUV compact premium | 0 g | 16,2 kWh | 536 km | 140 kW | 495 l | 1.700 kg | € 55.600 | 27.1% |
| ~ | Mercedes-Benz | CLA 250+ EQ | 2026 | Berline compact premium | 0 g | 12,2 kWh | 792 km | 200 kW | 405 l | 1.400 kg | € 55.900 | 27.1% |
| ~ | Mercedes-Benz | EQE 350+ | 2026 | Berline hogere middenklasse premium | 0 g | 15,9 kWh | 657 km | 215 kW | 430 l | 750 kg | € 79.800 | 27.1% |
| ~ | Mercedes-Benz | EQE SUV 350+ | 2026 | Grote SUV premium | 0 g | 17,4 kWh | 596 km | 215 kW | 520 l | 1.800 kg | € 88.900 | 27.1% |
| ~ | Volvo | EC40 Extended Range | 2026 | SUV coupé compact premium | 0 g | 15,7 kWh | 582 km | 185 kW | 404 l | 1.800 kg | € 51.900 | 27.1% |
| ~ | Volvo | EX90 Twin Motor | 2026 | Grote SUV premium | 0 g | 19,8 kWh | 614 km | 300 kW | 655 l | 2.200 kg | € 93.500 | 27.1% |
| ~ | Volvo | ES90 Single Motor Extended | 2026 | Berline hogere middenklasse premium | 0 g | 15,6 kWh | 700 km | 245 kW | 424 l | 1.500 kg | € 75.900 | 27.1% |
| ~ | Polestar | 3 Long Range Single Motor | 2026 | Grote SUV premium | 0 g | 17,4 kWh | 706 km | 220 kW | 484 l | 1.500 kg | € 79.900 | 27.1% |
| ~ | Polestar | 4 Long Range Single Motor | 2026 | SUV coupé hogere middenklasse | 0 g | 17 kWh | 620 km | 200 kW | 526 l | 1.500 kg | € 66.900 | 27.1% |
| ~ | Kia | EV9 Long Range RWD | 2026 | Grote SUV | 0 g | 20,2 kWh | 563 km | 150 kW | 333 l | 2.500 kg | € 74.990 | 27.1% |
| ~ | Kia | Niro EV 64,8 kWh | 2026 | SUV compact | 0 g | 16,2 kWh | 460 km | 150 kW | 475 l | 750 kg | € 41.990 | 27.1% |
| ~ | Hyundai | Ioniq 5 84 kWh RWD | 2026 | SUV middenklasse | 0 g | 16,4 kWh | 570 km | 168 kW | 520 l | 1.600 kg | € 49.990 | 27.1% |
| ~ | Hyundai | Ioniq 6 84 kWh RWD | 2026 | Berline middenklasse | 0 g | 14,3 kWh | 614 km | 168 kW | 401 l | 750 kg | € 49.490 | 27.1% |
| ~ | Hyundai | Inster Long Range | 2026 | Stadswagen | 0 g | 15,1 kWh | 370 km | 84 kW | 280 l | 0 kg | € 28.990 | 27.1% |
| ~ | Renault | Scenic E-Tech Long Range | 2026 | SUV middenklasse | 0 g | 16,5 kWh | 622 km | 160 kW | 545 l | 1.100 kg | € 44.990 | 27.1% |
| ~ | Renault | 5 E-Tech Comfort Range | 2026 | Stadswagen | 0 g | 14,5 kWh | 410 km | 110 kW | 326 l | 500 kg | € 32.990 | 27.1% |
| ~ | Renault | 4 E-Tech Comfort Range | 2026 | SUV compact | 0 g | 15,2 kWh | 409 km | 110 kW | 420 l | 750 kg | € 35.990 | 27.1% |
| ~ | Peugeot | e-208 51 kWh | 2026 | Stadswagen | 0 g | 13,2 kWh | 433 km | 115 kW | 352 l | 0 kg | € 35.100 | 27.1% |
| ~ | Peugeot | e-2008 54 kWh | 2026 | SUV compact | 0 g | 15,3 kWh | 406 km | 115 kW | 434 l | 0 kg | € 39.250 | 27.1% |
| ~ | Peugeot | e-308 54 kWh | 2026 | Compacte hatchback | 0 g | 14,1 kWh | 416 km | 115 kW | 361 l | 0 kg | € 42.600 | 27.1% |
| ~ | Peugeot | e-5008 73 kWh | 2026 | Grote SUV | 0 g | 16,8 kWh | 502 km | 157 kW | 748 l | 1.250 kg | € 50.850 | 27.1% |
| ~ | Citroën | ë-C3 44 kWh | 2026 | Stadswagen | 0 g | 15 kWh | 326 km | 83 kW | 310 l | 0 kg | € 24.990 | 27.1% |
| ~ | Citroën | ë-C4 54 kWh | 2026 | Compacte hatchback | 0 g | 14,5 kWh | 420 km | 115 kW | 380 l | 0 kg | € 37.490 | 27.1% |
| ~ | Citroën | ë-C5 Aircross 73 kWh | 2026 | SUV middenklasse | 0 g | 16,1 kWh | 520 km | 157 kW | 651 l | 1.200 kg | € 44.990 | 27.1% |
| ~ | Opel | Corsa Electric 51 kWh | 2026 | Stadswagen | 0 g | 13,6 kWh | 405 km | 115 kW | 309 l | 0 kg | € 34.450 | 27.1% |
| ~ | Opel | Mokka Electric 54 kWh | 2026 | SUV compact | 0 g | 15,4 kWh | 403 km | 115 kW | 310 l | 0 kg | € 38.650 | 27.1% |
| ~ | Opel | Astra Electric 54 kWh | 2026 | Compacte hatchback | 0 g | 14,2 kWh | 418 km | 115 kW | 352 l | 0 kg | € 41.900 | 27.1% |
| ~ | Opel | Grandland Electric 73 kWh | 2026 | SUV middenklasse | 0 g | 16 kWh | 523 km | 157 kW | 550 l | 1.250 kg | € 45.900 | 27.1% |
| ~ | Ford | Explorer Extended Range RWD | 2026 | SUV middenklasse | 0 g | 14,6 kWh | 602 km | 210 kW | 470 l | 1.200 kg | € 47.500 | 27.1% |
| ~ | Ford | Capri Extended Range RWD | 2026 | SUV coupé middenklasse | 0 g | 14,3 kWh | 627 km | 210 kW | 572 l | 1.000 kg | € 49.500 | 27.1% |
| ~ | Ford | Mustang Mach-E Extended Range RWD | 2026 | SUV hogere middenklasse | 0 g | 16,5 kWh | 600 km | 216 kW | 502 l | 750 kg | € 56.900 | 27.1% |
| ~ | Toyota | bZ4X 73 kWh | 2026 | SUV middenklasse | 0 g | 15,4 kWh | 573 km | 165 kW | 452 l | 750 kg | € 45.990 | 27.1% |
| ~ | Toyota | Urban Cruiser 61 kWh | 2026 | SUV compact | 0 g | 15,8 kWh | 428 km | 128 kW | 306 l | 750 kg | € 38.990 | 27.1% |
| ~ | Nissan | Ariya 87 kWh | 2026 | SUV middenklasse | 0 g | 17,8 kWh | 533 km | 178 kW | 468 l | 750 kg | € 51.990 | 27.1% |
| ~ | Nissan | Leaf 75 kWh | 2026 | Compacte hatchback | 0 g | 13,9 kWh | 604 km | 160 kW | 437 l | 0 kg | € 37.990 | 27.1% |
| ~ | MG | MG4 Comfort 64 kWh | 2026 | Compacte hatchback | 0 g | 16 kWh | 435 km | 150 kW | 363 l | 500 kg | € 32.990 | 27.1% |
| ~ | MG | MGS5 EV Long Range | 2026 | SUV compact | 0 g | 15,2 kWh | 480 km | 170 kW | 453 l | 500 kg | € 35.990 | 27.1% |
| ~ | BYD | Seal Design AWD | 2026 | Berline middenklasse | 0 g | 18,2 kWh | 520 km | 390 kW | 400 l | 750 kg | € 48.990 | 27.1% |
| ~ | BYD | Sealion 7 Comfort | 2026 | SUV hogere middenklasse | 0 g | 19,5 kWh | 482 km | 230 kW | 500 l | 1.500 kg | € 44.990 | 27.1% |
| ~ | BYD | Dolphin Comfort | 2026 | Stadswagen | 0 g | 15,9 kWh | 427 km | 150 kW | 345 l | 0 kg | € 30.990 | 27.1% |
| ~ | BYD | Atto 3 Comfort | 2026 | SUV compact | 0 g | 16 kWh | 420 km | 150 kW | 440 l | 750 kg | € 37.990 | 27.1% |
| ~ | Fiat | 500e 42 kWh | 2026 | Stadswagen | 0 g | 14,4 kWh | 320 km | 87 kW | 185 l | 0 kg | € 30.990 | 27.1% |
| ~ | Fiat | 600e 54 kWh | 2026 | SUV compact | 0 g | 15,2 kWh | 409 km | 115 kW | 360 l | 0 kg | € 36.990 | 27.1% |
| ~ | Fiat | Grande Panda 44 kWh | 2026 | Stadswagen | 0 g | 15,1 kWh | 320 km | 83 kW | 361 l | 0 kg | € 25.990 | 27.1% |
| ~ | Jeep | Avenger 54 kWh | 2026 | SUV compact | 0 g | 15,6 kWh | 400 km | 115 kW | 355 l | 0 kg | € 37.990 | 27.1% |
| ~ | Alfa Romeo | Junior Elettrica 54 kWh | 2026 | SUV compact premium | 0 g | 15 kWh | 410 km | 115 kW | 400 l | 0 kg | € 39.500 | 27.1% |
| ~ | DS | DS 3 E-Tense 54 kWh | 2026 | SUV compact premium | 0 g | 15,3 kWh | 404 km | 115 kW | 350 l | 0 kg | € 41.900 | 27.1% |
| ~ | MINI | Cooper E 40,7 kWh | 2026 | Stadswagen premium | 0 g | 14,3 kWh | 305 km | 135 kW | 210 l | 0 kg | € 34.900 | 27.1% |
| ~ | MINI | Countryman E 66 kWh | 2026 | SUV compact premium | 0 g | 15,7 kWh | 462 km | 150 kW | 460 l | 1.200 kg | € 44.900 | 27.1% |
| ~ | smart | #1 Pro+ | 2026 | SUV compact | 0 g | 16,8 kWh | 440 km | 200 kW | 411 l | 1.600 kg | € 39.900 | 27.1% |
| ~ | smart | #3 Pro+ | 2026 | SUV coupé compact | 0 g | 16,3 kWh | 455 km | 200 kW | 370 l | 1.600 kg | € 41.900 | 27.1% |
| ~ | Porsche | Macan 4 Electric | 2026 | SUV premium sportief | 0 g | 18,8 kWh | 613 km | 300 kW | 540 l | 2.000 kg | € 89.400 | 27.1% |
| ~ | Porsche | Taycan RWD | 2026 | Berline premium sportief | 0 g | 17,9 kWh | 590 km | 300 kW | 407 l | 0 kg | € 105.500 | 27.1% |
| ~ | Lexus | RZ 350e | 2026 | SUV middenklasse premium | 0 g | 15,6 kWh | 568 km | 165 kW | 522 l | 750 kg | € 62.900 | 27.1% |
| ~ | Mazda | 6e Long Range | 2026 | Berline middenklasse | 0 g | 16,6 kWh | 552 km | 180 kW | 466 l | 0 kg | € 45.990 | 27.1% |
| ~ | XPENG | G6 Long Range | 2026 | SUV hogere middenklasse | 0 g | 17,5 kWh | 570 km | 210 kW | 571 l | 1.500 kg | € 45.990 | 27.1% |
| ~ | Honda | e:Ny1 68,8 kWh | 2026 | SUV compact | 0 g | 18,2 kWh | 412 km | 150 kW | 344 l | 750 kg | € 42.500 | 27.1% |
| ~ | Subaru | Solterra AWD | 2026 | SUV middenklasse | 0 g | 17,4 kWh | 494 km | 165 kW | 452 l | 750 kg | € 51.990 | 27.1% |
| ~ | Leapmotor | C10 BEV | 2026 | SUV hogere middenklasse | 0 g | 19 kWh | 420 km | 160 kW | 581 l | 1.500 kg | € 37.990 | 27.1% |
| ~ | Leapmotor | T03 37,3 kWh | 2026 | Stadswagen | 0 g | 15,9 kWh | 265 km | 70 kW | 210 l | 0 kg | € 18.900 | 27.1% |

## Plug-in hybride (35)

| ✔ | Merk | Model | Modeljaar | Segment | CO₂ | Verbruik/100 km | Actieradius | Vermogen | Koffer | Trekgewicht | Cataloguswaarde | Restwaarde 4j |
| :-: | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| ✔ | BMW | 330e Berline | 2026 | Berline premium | 25 g | 1,1 l | 101 km | 220 kW | 375 l | 1.500 kg | € 57.900 | 34.6% |
| ✔ | Mercedes-Benz | GLC 300 e 4MATIC | 2026 | SUV middenklasse premium | 15 g | 0,6 l | 130 km | 230 kW | 470 l | 2.000 kg | € 72.400 | 34.6% |
| ✔ | Volvo | XC60 T6 AWD Plug-in | 2026 | SUV hogere middenklasse premium | 81 g | 1 l | 80 km | 257 kW | 468 l | 2.100 kg | € 71.500 | 34.6% |
| ✔ | BMW | 530e Berline | 2026 | Berline hogere middenklasse premium | 41 g | 1,8 l | 61 km | 215 kW | 415 l | 2.000 kg | € 72.900 | 34.6% |
| ✔ | BMW | X1 xDrive30e | 2026 | SUV compact premium | 64 g | 2,8 l | 83 km | 240 kW | 490 l | 1.800 kg | € 57.500 | 34.6% |
| ✔ | BMW | X3 30e xDrive | 2026 | SUV middenklasse premium | 57 g | 2,5 l | 50 km | 215 kW | 460 l | 2.000 kg | € 69.900 | 34.6% |
| ~ | BMW | X5 xDrive50e | 2026 | Grote SUV premium | 29 g | 1,3 l | 110 km | 360 kW | 500 l | 2.700 kg | € 99.900 | 34.6% |
| ~ | Mercedes-Benz | C 300 e Berline | 2026 | Berline premium | 13 g | 0,6 l | 111 km | 230 kW | 315 l | 1.800 kg | € 63.900 | 34.6% |
| ~ | Mercedes-Benz | E 300 e Berline | 2026 | Berline hogere middenklasse premium | 14 g | 0,6 l | 116 km | 230 kW | 370 l | 2.100 kg | € 76.900 | 34.6% |
| ~ | Mercedes-Benz | A 250 e Hatchback | 2026 | Compacte hatchback premium | 27 g | 1,2 l | 82 km | 160 kW | 310 l | 1.600 kg | € 48.900 | 34.6% |
| ~ | Mercedes-Benz | GLE 350 de 4MATIC | 2026 | Grote SUV premium | 19 g | 0,7 l | 108 km | 245 kW | 490 l | 3.500 kg | € 98.500 | 34.6% |
| ~ | Volvo | XC90 T8 AWD Plug-in | 2026 | Grote SUV premium | 23 g | 1 l | 71 km | 335 kW | 302 l | 2.400 kg | € 91.500 | 34.6% |
| ~ | Volvo | V60 T6 AWD Plug-in | 2026 | Break hogere middenklasse premium | 19 g | 0,8 l | 81 km | 258 kW | 519 l | 2.000 kg | € 67.900 | 34.6% |
| ~ | Audi | A3 40 TFSI e | 2026 | Compacte hatchback premium | 9 g | 0,4 l | 141 km | 200 kW | 335 l | 1.500 kg | € 48.900 | 34.6% |
| ~ | Audi | Q3 45 TFSI e | 2026 | SUV compact premium | 11 g | 0,5 l | 119 km | 200 kW | 425 l | 1.800 kg | € 54.900 | 34.6% |
| ~ | Audi | Q5 50 TFSI e quattro | 2026 | SUV middenklasse premium | 15 g | 0,7 l | 100 km | 220 kW | 465 l | 2.000 kg | € 71.900 | 34.6% |
| ~ | Audi | A6 50 TFSI e | 2026 | Berline hogere middenklasse premium | 17 g | 0,8 l | 105 km | 220 kW | 360 l | 2.000 kg | € 74.900 | 34.6% |
| ~ | Volkswagen | Golf eHybrid | 2026 | Compacte hatchback | 8 g | 0,4 l | 143 km | 150 kW | 273 l | 1.600 kg | € 42.900 | 34.6% |
| ~ | Volkswagen | Passat eHybrid | 2026 | Break hogere middenklasse | 9 g | 0,4 l | 138 km | 150 kW | 510 l | 1.600 kg | € 51.900 | 34.6% |
| ~ | Volkswagen | Tiguan eHybrid | 2026 | SUV middenklasse | 9 g | 0,4 l | 133 km | 150 kW | 490 l | 1.800 kg | € 49.900 | 34.6% |
| ~ | Škoda | Superb iV | 2026 | Break hogere middenklasse | 9 g | 0,4 l | 137 km | 150 kW | 510 l | 1.600 kg | € 48.900 | 34.6% |
| ~ | Škoda | Kodiaq iV | 2026 | Grote SUV | 10 g | 0,4 l | 123 km | 150 kW | 745 l | 1.800 kg | € 50.900 | 34.6% |
| ~ | Cupra | Formentor e-Hybrid | 2026 | SUV compact sportief | 9 g | 0,4 l | 122 km | 200 kW | 345 l | 1.600 kg | € 47.900 | 34.6% |
| ~ | Cupra | Leon e-Hybrid | 2026 | Compacte hatchback sportief | 9 g | 0,4 l | 133 km | 200 kW | 270 l | 1.600 kg | € 45.900 | 34.6% |
| ~ | Peugeot | 308 Hybrid 195 | 2026 | Compacte hatchback | 24 g | 1,1 l | 61 km | 143 kW | 361 l | 1.200 kg | € 43.900 | 34.6% |
| ~ | Peugeot | 408 Hybrid 225 | 2026 | SUV coupé middenklasse | 26 g | 1,1 l | 64 km | 165 kW | 471 l | 1.200 kg | € 48.900 | 34.6% |
| ~ | Toyota | RAV4 Plug-in Hybrid AWD | 2026 | SUV middenklasse | 22 g | 1 l | 75 km | 225 kW | 520 l | 1.500 kg | € 54.900 | 34.6% |
| ~ | Toyota | C-HR Plug-in Hybrid | 2026 | SUV compact | 19 g | 0,8 l | 66 km | 164 kW | 310 l | 750 kg | € 45.900 | 34.6% |
| ~ | Toyota | Prius Plug-in Hybrid | 2026 | Compacte hatchback | 11 g | 0,5 l | 86 km | 164 kW | 284 l | 0 kg | € 44.900 | 34.6% |
| ~ | Kia | Sportage Plug-in Hybrid AWD | 2026 | SUV middenklasse | 25 g | 1,1 l | 70 km | 195 kW | 540 l | 1.350 kg | € 48.900 | 34.6% |
| ~ | Hyundai | Tucson Plug-in Hybrid AWD | 2026 | SUV middenklasse | 27 g | 1,2 l | 70 km | 185 kW | 558 l | 1.350 kg | € 47.900 | 34.6% |
| ~ | Hyundai | Santa Fe Plug-in Hybrid AWD | 2026 | Grote SUV | 33 g | 1,5 l | 58 km | 185 kW | 628 l | 1.110 kg | € 59.900 | 34.6% |
| ~ | Ford | Kuga Plug-in Hybrid | 2026 | SUV middenklasse | 20 g | 0,9 l | 69 km | 180 kW | 412 l | 1.200 kg | € 44.900 | 34.6% |
| ~ | Mazda | CX-60 PHEV AWD | 2026 | SUV hogere middenklasse premium | 33 g | 1,5 l | 63 km | 241 kW | 570 l | 2.500 kg | € 57.900 | 34.6% |
| ~ | BYD | Seal U DM-i Comfort | 2026 | SUV middenklasse | 25 g | 1,1 l | 80 km | 160 kW | 425 l | 1.500 kg | € 39.990 | 34.6% |

## Hybride (13)

| ✔ | Merk | Model | Modeljaar | Segment | CO₂ | Verbruik/100 km | Actieradius | Vermogen | Koffer | Trekgewicht | Cataloguswaarde | Restwaarde 4j |
| :-: | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| ~ | Toyota | Corolla Hybrid 140 | 2026 | Compacte hatchback | 102 g | 4,5 l | – | 103 kW | 361 l | 750 kg | € 33.900 | 39.5% |
| ~ | Toyota | Corolla Touring Sports Hybrid 140 | 2026 | Compacte break | 105 g | 4,6 l | – | 103 kW | 596 l | 750 kg | € 35.900 | 39.5% |
| ~ | Toyota | Yaris Hybrid 130 | 2026 | Stadswagen | 94 g | 4,2 l | – | 96 kW | 286 l | 0 kg | € 28.900 | 39.5% |
| ~ | Toyota | Yaris Cross Hybrid 130 | 2026 | SUV compact | 105 g | 4,7 l | – | 96 kW | 397 l | 750 kg | € 32.900 | 39.5% |
| ~ | Toyota | C-HR Hybrid 140 | 2026 | SUV compact | 105 g | 4,7 l | – | 103 kW | 388 l | 750 kg | € 38.900 | 39.5% |
| ~ | Toyota | RAV4 Hybrid AWD-i | 2026 | SUV middenklasse | 131 g | 5,8 l | – | 163 kW | 580 l | 1.650 kg | € 48.900 | 39.5% |
| ~ | Renault | Clio E-Tech 145 | 2026 | Stadswagen | 96 g | 4,2 l | – | 105 kW | 301 l | 0 kg | € 28.500 | 39.5% |
| ~ | Renault | Captur E-Tech 145 | 2026 | SUV compact | 105 g | 4,7 l | – | 105 kW | 326 l | 750 kg | € 32.500 | 39.5% |
| ~ | Renault | Symbioz E-Tech 145 | 2026 | SUV compact | 105 g | 4,7 l | – | 105 kW | 492 l | 750 kg | € 36.900 | 39.5% |
| ~ | Honda | Civic e:HEV | 2026 | Compacte hatchback | 108 g | 4,8 l | – | 135 kW | 410 l | 0 kg | € 40.900 | 39.5% |
| ~ | Honda | CR-V e:HEV AWD | 2026 | SUV middenklasse | 151 g | 6,7 l | – | 135 kW | 587 l | 750 kg | € 52.900 | 39.5% |
| ~ | Kia | Niro Hybrid | 2026 | SUV compact | 108 g | 4,8 l | – | 104 kW | 451 l | 1.300 kg | € 34.900 | 39.5% |
| ~ | Hyundai | Tucson Hybrid | 2026 | SUV middenklasse | 127 g | 5,6 l | – | 158 kW | 616 l | 1.650 kg | € 41.900 | 39.5% |

## Verbranding (22)

| ✔ | Merk | Model | Modeljaar | Segment | CO₂ | Verbruik/100 km | Actieradius | Vermogen | Koffer | Trekgewicht | Cataloguswaarde | Restwaarde 4j |
| :-: | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| ~ | BMW | 320d Berline | 2026 | Berline premium | 122 g | 4,6 l | – | 145 kW | 480 l | 1.800 kg | € 53.900 | 37.6% |
| ~ | Volkswagen | Golf 1.5 eTSI | 2026 | Compacte hatchback | 126 g | 5,6 l | – | 110 kW | 381 l | 1.500 kg | € 34.900 | 38.8% |
| ~ | BMW | 520d Berline | 2026 | Berline hogere middenklasse premium | 130 g | 4,9 l | – | 145 kW | 520 l | 2.000 kg | € 67.900 | 37.6% |
| ~ | BMW | X1 sDrive18d | 2026 | SUV compact premium | 132 g | 5 l | – | 110 kW | 540 l | 1.600 kg | € 49.900 | 37.6% |
| ~ | BMW | X3 20d xDrive | 2026 | SUV middenklasse premium | 145 g | 5,5 l | – | 145 kW | 570 l | 2.400 kg | € 65.900 | 37.6% |
| ~ | Mercedes-Benz | C 220 d Berline | 2026 | Berline premium | 124 g | 4,7 l | – | 145 kW | 455 l | 1.800 kg | € 56.900 | 37.6% |
| ~ | Mercedes-Benz | E 220 d Berline | 2026 | Berline hogere middenklasse premium | 130 g | 4,9 l | – | 145 kW | 540 l | 2.100 kg | € 70.900 | 37.6% |
| ~ | Mercedes-Benz | GLC 220 d 4MATIC | 2026 | SUV middenklasse premium | 150 g | 5,7 l | – | 145 kW | 620 l | 2.500 kg | € 68.900 | 37.6% |
| ~ | Audi | A5 35 TDI | 2026 | Berline premium | 128 g | 4,9 l | – | 120 kW | 445 l | 1.800 kg | € 55.900 | 37.6% |
| ~ | Audi | Q5 35 TDI | 2026 | SUV middenklasse premium | 146 g | 5,6 l | – | 120 kW | 520 l | 2.000 kg | € 63.900 | 37.6% |
| ~ | Volkswagen | Passat 2.0 TDI | 2026 | Break hogere middenklasse | 125 g | 4,8 l | – | 110 kW | 690 l | 2.000 kg | € 46.900 | 37.6% |
| ~ | Volkswagen | Tiguan 2.0 TDI | 2026 | SUV middenklasse | 141 g | 5,4 l | – | 110 kW | 652 l | 2.000 kg | € 45.900 | 37.6% |
| ~ | Volkswagen | T-Roc 1.5 eTSI | 2026 | SUV compact | 137 g | 6,1 l | – | 110 kW | 465 l | 1.500 kg | € 37.900 | 38.8% |
| ~ | Škoda | Octavia Combi 2.0 TDI | 2026 | Compacte break | 121 g | 4,6 l | – | 110 kW | 640 l | 1.800 kg | € 39.900 | 37.6% |
| ~ | Škoda | Superb Combi 2.0 TDI | 2026 | Break hogere middenklasse | 126 g | 4,8 l | – | 110 kW | 690 l | 2.000 kg | € 45.900 | 37.6% |
| ~ | Škoda | Kamiq 1.0 TSI | 2026 | SUV compact | 129 g | 5,7 l | – | 85 kW | 400 l | 1.100 kg | € 29.900 | 38.8% |
| ~ | Volvo | XC60 B5 mild hybrid | 2026 | SUV hogere middenklasse premium | 168 g | 7,4 l | – | 184 kW | 483 l | 2.000 kg | € 63.900 | 38.8% |
| ~ | Volvo | V60 B4 mild hybrid | 2026 | Break hogere middenklasse premium | 154 g | 6,8 l | – | 145 kW | 519 l | 1.800 kg | € 55.900 | 38.8% |
| ~ | Peugeot | 3008 Hybrid 136 | 2026 | SUV middenklasse | 124 g | 5,5 l | – | 100 kW | 520 l | 1.200 kg | € 40.900 | 38.8% |
| ~ | Dacia | Duster TCe 130 mild hybrid | 2026 | SUV compact | 134 g | 5,9 l | – | 96 kW | 517 l | 1.500 kg | € 26.900 | 38.8% |
| ~ | Ford | Puma 1.0 EcoBoost mHEV | 2026 | SUV compact | 130 g | 5,7 l | – | 92 kW | 456 l | 1.100 kg | € 30.900 | 38.8% |
| ~ | Opel | Astra 1.2 Turbo | 2026 | Compacte hatchback | 128 g | 5,7 l | – | 96 kW | 422 l | 1.200 kg | € 33.900 | 38.8% |

## Bronnen per geverifieerd model

Voor de ramingen geldt: fabrikantopgave WLTP en Belgische prijslijsten, niet nagekeken. Per rij
staat het modeljaar vermeld, zodat een cijfer na te kijken valt tegen de juiste versie van het
model. Hieronder staat per geverifieerd model waar de cijfers vandaan komen.

| Model | Bron |
| --- | --- |
| Tesla Model Y Long Range AWD | autogids.be 2026 (prijs, CO₂, vermogen); ev-database.org (bruikbare batterij) |
| Audi Q4 e-tron 45 | autogids.be 2026 (prijs 82 kWh SUV); audi.be (CO₂); ev-database.org (bruikbare batterij) |
| BMW i4 eDrive40 | bmw.be fiscale prijslijst (excl. btw €50.247,93); CO₂ bmw.be |
| BMW 330e Berline | bmw.be technische gegevens (Euro 6e-bis, 19–25 g/km); batterij ekris.nl (netto) |
| Mercedes-Benz GLC 300 e 4MATIC | media.mercedes-benz.nl (gewogen CO₂ 12–15 g/km); mercedesblog (bruikbare batterij 23,4 van 31,2 kWh bruto) |
| Volvo XC60 T6 AWD Plug-in | volvocars.com DE (gewogen CO₂ 61–81 g/km); motorandauto.nl (bruikbare batterij) |
| BMW 530e Berline | bmw.be fiscale prijslijst (30–41 g/km) |
| BMW X1 xDrive30e | bmw.be technische gegevens (55–64 g/km) |
| BMW X3 30e xDrive | bmw.be fiscale prijslijst (45–57 g/km) |
