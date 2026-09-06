# Lokala utredningsscheman

Den här katalogen är den kanoniska lokala källan för den första schema-labben. Filerna är kompletta request bodies för JSON Schema-API:t, men labben läser dem direkt och publicerar ingenting.

| Parameter key / schema name | Lokal version | JSON Schema POST body                      | UI Schema PUT body                            |
| --------------------------- | ------------- | ------------------------------------------ | --------------------------------------------- |
| `utredning-enhetschef`      | 1.1           | `utredning-enhetschef.schema-request.json` | `utredning-enhetschef.ui-schema-request.json` |
| `utredning-sol-lss`         | 1.1           | `utredning-sol-lss.schema-request.json`    | `utredning-sol-lss.ui-schema-request.json`    |
| `utredning-hsl`             | 1.0           | `utredning-hsl.schema-request.json`        | `utredning-hsl.ui-schema-request.json`        |

Vid publicering skickas `*.schema-request.json` till `POST /2281/schemas`. Det skapade schema-ID:t används sedan med motsvarande `*.ui-schema-request.json` i `PUT /2281/schemas/{id}/ui-schema`.

## Publicerat i test

Version 1.0 publicerades och lästes tillbaka från JsonSchema-API:ts testmiljö den 12 augusti 2026:

- `2281_utredning-enhetschef_1.0`
- `2281_utredning-sol-lss_1.0`
- `2281_utredning-hsl_1.0`

Schema och UI Schema verifierades separat för varje ID. Inget har publicerats i produktionsmiljön.

Version 1.1 för `utredning-enhetschef` och `utredning-sol-lss` finns endast som lokala artefakter i repot. Att en
requestartefakt finns här innebär inte att den har skickats till JsonSchema-API:t. `utredning-hsl` ligger kvar på
version 1.0.

Schema v1.0 innehåller utredningsdata. Åtgärder, handlingsplaner, interna arbetsanteckningar, rapportgenerering och lokala markeringar om kompletta accordionsektioner ligger avsiktligt utanför dokumenten.

I version 1.1 deklarerar enhetschefs- och SOL/LSS-schemana det externa fältet
`x-draken-external-fields.errandClassification`. Respektive UI Schema placerar
`$external:errandClassification` direkt efter `legalBases`. Deklarationen låter schemat styra var klassificeringen
visas och vilket lagrumsfält som filtrerar den, men avvikelsetyp, underkategori och deras UUID:n ägs av ärendets
SupportManagement-labels. De är inte JSON Schema-properties och sparas inte i utredningsdokumentets JSON.

Vanliga avvikelser redigerar klassificeringen i enhetschefsutredningen. För `eventType: MISSFORHALLANDE` flyttas
redigeringsansvaret till SOL/LSS-utredningen, med SOL och LSS förvalda och skrivskyddade. `Spara utredning` samordnar
dokumentets egen PUT med en smal label-PATCH. Om PUT:en lyckas men label-PATCH:en misslyckas rapporteras en delvis
genomförd sparning, och ett nytt försök skickar endast label-PATCH:en.

Redan sparade enhetschefs- och SOL/LSS-dokument som är bundna till schema till och med version 1.0 får samma externa
fältplacering via en runtime-fallback. Det ändrar inte deras bundna schema eller dokumentdata. Utredningsfeaturen är
den centrala ägaren även om ett nyare schema av misstag saknar deklarationen; då används samma säkra placering och
Draken visar en schemavarning, så att kategoriseringen varken försvinner eller får två redigeringsställen.

Riskvärden använder följande stabila sökvägar:

- `riskAssessmentHsl.probability * riskAssessmentHsl.severity = riskAssessmentHsl.calculatedRiskValue`
- `riskAssessmentSolLss.probability * riskAssessmentSolLss.severity = riskAssessmentSolLss.calculatedRiskValue`

Formel och indata finns även som `x-calculation` på respektive riskobjekt. Resultatfälten är skrivskyddade i både JSON Schema och UI Schema.
JSON Schema innehåller dessutom samtliga 16 giltiga kombinationer för skalan 1–4 och avvisar ett lagrat resultat som
inte motsvarar `probability * severity`.

`fixtures/investigation-schema-cases.json` innehåller ett fullständigt giltigt lokalt `formData`-objekt och negativa kontraktsfall för vart och ett av de tre schemana.

Kör kontraktstesterna från `frontend`:

```sh
yarn test src/supportmanagement/investigation/schemas
```

Publicerade schema- och UI-schema-versioner ska behandlas som immutabla. Ändringar av kontrakt eller presentation publiceras med ett nytt versionsnummer.
