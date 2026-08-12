# Lokala utredningsscheman

Den här katalogen är den kanoniska lokala källan för den första schema-labben. Filerna är kompletta request bodies för JSON Schema-API:t, men labben läser dem direkt och publicerar ingenting.

| Parameter key / schema name | JSON Schema POST body                      | UI Schema PUT body                            |
| --------------------------- | ------------------------------------------ | --------------------------------------------- |
| `utredning-enhetschef`      | `utredning-enhetschef.schema-request.json` | `utredning-enhetschef.ui-schema-request.json` |
| `utredning-sol-lss`         | `utredning-sol-lss.schema-request.json`    | `utredning-sol-lss.ui-schema-request.json`    |
| `utredning-hsl`             | `utredning-hsl.schema-request.json`        | `utredning-hsl.ui-schema-request.json`        |

Vid publicering skickas `*.schema-request.json` till `POST /2281/schemas`. Det skapade schema-ID:t används sedan med motsvarande `*.ui-schema-request.json` i `PUT /2281/schemas/{id}/ui-schema`.

## Publicerat i test

Version 1.0 publicerades och lästes tillbaka från JsonSchema-API:ts testmiljö den 12 augusti 2026:

- `2281_utredning-enhetschef_1.0`
- `2281_utredning-sol-lss_1.0`
- `2281_utredning-hsl_1.0`

Schema och UI Schema verifierades separat för varje ID. Inget har publicerats i produktionsmiljön.

Schema v1.0 innehåller utredningsdata. Åtgärder, handlingsplaner, interna arbetsanteckningar, rapportgenerering och lokala markeringar om kompletta accordionsektioner ligger avsiktligt utanför dokumenten.

Avvikelsetyp och underkategori ägs av ärendets labels och renderas separat i Draken. De ska därför inte läggas till i utredningsschemana eller deras formulärdata.

Riskvärden använder följande stabila sökvägar:

- `riskAssessmentHsl.probability * riskAssessmentHsl.severity = riskAssessmentHsl.calculatedRiskValue`
- `riskAssessmentSolLss.probability * riskAssessmentSolLss.severity = riskAssessmentSolLss.calculatedRiskValue`

Formel och indata finns även som `x-calculation` på respektive riskobjekt. Resultatfälten är skrivskyddade i både JSON Schema och UI Schema.
JSON Schema innehåller dessutom samtliga 16 giltiga kombinationer för skalan 1–4 och avvisar ett lagrat resultat som
inte motsvarar `probability * severity`.

`fixtures/investigation-schema-cases.json` innehåller ett fullständigt giltigt lokalt `formData`-objekt och negativa kontraktsfall för vart och ett av de tre schemana.

Kör kontraktstesterna från `frontend`:

```sh
yarn test:investigation-schemas
```

Publicerade schema- och UI-schema-versioner ska behandlas som immutabla. Ändringar av kontrakt eller presentation publiceras med ett nytt versionsnummer.
