# Avvikelses verksamhetspolicy

IAF och VOF väljer denna modul i respektive `dragons/<id>/application.ts`.

- `investigation-profile.ts`: dokument, filter och kopplingen till SM:s serverkontrakt.
- `classification-policy.ts`: klassificeringens ägare och skyddade parametrar.
- `classification-context.ts`: dokumentets lagrum och tillåtna kategorier.

Generell JSON-transport, schemahantering, versionskontroll och fel vid samtidiga skrivningar
ägs fortsatt av SM. SM importerar inte Avvikelse; reglerna lämnas över genom profilen innan
servern startar. Runtime-DTO:n serialiserar aldrig profilens serverfunktioner.
