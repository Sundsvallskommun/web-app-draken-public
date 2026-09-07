# Införa en enda utredningsflagga

Den nya koden väljer implementation i drakens `application.ts`. `useInvestigation` är den
enda runtimeflaggan för utredning. IAF/VOF använder Avvikelse, AOT sin egen implementation.
`useAvvikelseInvestigation` och `useAotInvestigation`, samt motsvarande miljövariabler,
är avvecklade. Kvarvarande rader avvisas även när de är `false`, så att en tidigare avstängd
utredning aldrig råkar aktiveras genom att en gammal begränsning ignoreras.

Detta är en **manuell införanderutin**. Ingen databas, Adminpanel, GitHub-regel eller driftmiljö
ändras av verktyget. Ett godkänt införande behövs innan förslaget tillämpas externt.

## Förbered ett avgränsat förslag

1. Ta säkerhetskopia av aktuella flaggor och release-konfiguration för **en drake och ett namespace**.
   Kontrollera aktuell kod och om draken använder Avvikelse, AOT eller saknar utredning.
2. Exportera Adminpanel-raderna med `application`, `namespace`, `name`, `enabled` och befintliga
   metadata. Ta endast med de tre relevanta miljöflaggorna i `environment`; inga hemligheter.
3. Skapa ett lokalt JSON-underlag med `version: 1`. Versionen avser migreringsunderlaget, inte
   någon ny runtimeflagga. Exempel på en avsiktligt avstängd Avvikelse-utredning:

```json
{
  "version": 1,
  "application": "IAF",
  "namespace": "HEALTHCAREDEVIATIONIAF",
  "implementation": "avvikelse",
  "environment": {
    "NEXT_PUBLIC_USE_INVESTIGATION": "true",
    "NEXT_PUBLIC_USE_AVVIKELSE_INVESTIGATION": "false"
  },
  "flags": [
    { "application": "IAF", "namespace": "HEALTHCAREDEVIATIONIAF", "name": "useInvestigation", "enabled": true },
    { "application": "IAF", "namespace": "HEALTHCAREDEVIATIONIAF", "name": "useAvvikelseInvestigation", "enabled": false }
  ]
}
```

```sh
# Kör från exportkatalogen: båda filerna måste ligga under arbetskatalogen.
cd /secure
node /path/to/web-app-draken-public/scripts/migrate-investigation-flags.mjs iaf-before.json iaf-proposal.json
```

Verktyget beräknar `gammal huvudflagga OCH gammal flagga för inkopplad implementation`.
Saknad flagga räknas som avstängd. I exemplet blir den nya huvudflaggan `false`.
Båda gamla variantnamnen tas bort inom valt scope. Andra flaggor, metadata och andra
applikationer/namespaces lämnas oförändrade. Dubbletter inom valt scope avvisas.

En icke-tom flagglista ersätter frontendens miljöflaggor som tidigare; en tom lista lämnar
miljöinställningarna kvar. Verktyget bevarar båda källornas tidigare värden separat. Fältet
`effectiveInvestigationEnabled` visar frontendens effektiva värde, inte en behörighetsgaranti.
Med konfigurerat Adminpanel behandlar backend en saknad huvudflagga som avstängd, även om
frontendens miljöflagga är på. Ha därför en explicit `useInvestigation`-rad när Adminpanel används.

Utdata har `version: 2`. Samma förslag kan kontrolleras igen utan att ändras. Version 2 med
gamla flaggor avvisas; verktyget gissar inte om ett omärkt underlag redan har migrerats.
Utdata skapas som en ny fil med begränsade filrättigheter, befintliga filer skrivs aldrig över,
och exporterade värden skrivs inte till terminalen. Lägg inga exporter i Git.

## Granska och inför

1. Jämför före/efter. Kontrollera drake, namespace, implementation, huvudflaggans effektiva
   värde och att inga orelaterade rader ändras. Låt samma ansvariga team granska kod och införande.
2. För över den nya miljöflaggan till `frontend.environment` i release-manifestet. Backend får
   samma värde från manifestet; ange inte en andra kopia i `backend.environment`.
   För lokal utveckling behöver båda env-filerna samma värde. Ta bort gamla variantnycklar
   även från ärvda processvariabler och Nexts `.env*`-filer. Ändra inte andra inställningar.
3. Bygg, granska och testa frontend/backend från samma revision och med det nya manifestet.
4. Vid godkänt införande: stoppa/avled berörd trafik, tillämpa de avgränsade Adminpanel-ändringarna,
   byt frontend/backend tillsammans och verifiera innan trafiken öppnas. Gamla och nya klienter
   får inte samtidigt förväntas förstå samma flaggmodell. Befintlig kontroll av release-identitet
   kräver omladdning av en klient från en annan release.
5. Verifiera på/av, rätt dokument, registrering, filter, nekad skrivning och versionskonflikt.
   Prova även en annan drake så att dess funktioner är opåverkade. Rensa inte ärendedokument.

Kvarvarande gamla Adminpanel-rader ger `409 / INVESTIGATION_FLAGS_REQUIRE_MIGRATION` från
flagg-API:t. Frontend visar att konfigurationen behöver rättas. Backend använder inte en
utgången cache med aktiva flaggor för att dölja detta konfigurationsfel. Ett upptäckt
konfigurationsfel kvarstår även vid efterföljande avbrott tills ett giltigt besked bekräftar rättningen. Vid vanligt avbrott
behåller frontend sin miljöfallback; skyddade backendändringar spärras när ett färskt flaggbesked
saknas. En färsk backendcache kan vara upp till 30 sekunder gammal. Frontend behöver omladdning
för ändrade flaggor; det finns ingen pushuppdatering eller garanti att redan påbörjade anrop avbryts.

## Återställning

Avled trafiken och återställ **både** föregående imagepar/manifest och säkerhetskopian av de gamla
flaggorna för samma scope. Gamla klienter behöver de gamla variantflaggorna. Starta om berörda
processer så att cachade flaggor försvinner, kontrollera identitet och funktion, öppna sedan trafik.
Ingen JSON-dokumentmigrering ingår; den här ändringen ändrar inte lagrade utredningar eller scheman.
