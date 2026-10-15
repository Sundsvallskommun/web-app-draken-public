# Tillsynsprotokoll

Word-originalen och exempel-PDF:er för tillsynsprotokollen. Själva mallarna (HTML, kontrollpunkter, fält och
exempeldata) bor i koden, en mapp per mall:

| Mall | Mapp i `frontend/src/supportmanagement/inspection-protocols/` | Templating-identifierare |
|---|---|---|
| Alkohollagen (serveringstillstånd) | `serving-permit/` | `serving-inspection-protocol` |
| Inre tillsyn | `internal-inspection/` | `internal-inspection-protocol` |

Varje mapp har `index.ts` (nyckel, namn, identifierare, kontrollpunkter, fält), `template.ts` (HTML:en som en
sträng) och `sampledata.json` (alla nycklar mallen läser, med exempelvärden). Koden renderar HTML:en direkt
(`render/direct/pdf`) tills mallen är uppladdad till Templating.

## Ladda upp en mall

1. Ta strängen ur `template.ts` och base64-koda den.
2. `POST /{municipalityId}/templates` på Templating med `identifier` enligt tabellen, `name` = mallens namn och
   `content` = base64-strängen. (AoT-klienten saknar prenumeration på Templating ännu, 403; använd MEX-klienten.)
3. Ta bort raden `html: …` i mallens `index.ts`. Rendering går då via identifieraren.
4. Verifiera med exempeldatan: `POST /{municipalityId}/render/pdf` med `identifier` och `parameters` =
   `sampledata.json`.

Alkohollagens HTML läser också ett 50-tal `observation*`-nycklar (glaskross, trängsel m.m.) som inget fält i
`index.ts` fyller: matrisen skrivs ut tom och fylls i på papper. Nycklarna måste stå kvar i `sampledata.json`.

## Lägga till en mall

Ny mapp med samma tre filer, registrera den i `inspection-protocols/index.ts`. Testet i
`support-inspection-protocol-service.test.ts` kontrollerar att alla nycklar koden skickar finns i exempeldatan.
Tobak och Tobak marknadsföring väntar på konvertering på samma sätt.
