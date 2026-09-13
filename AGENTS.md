# Arbete i Draken

Läs [ägarskap och importgränser](docs/architecture/boundaries.md) före en strukturell ändring.

- Börja med befintlig ägare. Flytta eller fördjupa den före en ny implementation.
- Common ska äga generella mekanismer. Domänen äger kontrakt och ärenderegler; verksamhetsmodulen
  äger sitt flöde. Draken väljer implementation och shell komponerar den.
- Lägg inte till appnamnsvillkor i common eller domäner. Använd ett konkret domänkontrakt.
- Inga korsimporter mellan drakar/domäner eller dolda beroenden genom återexporter och typer.
- Ändra inte säkerhetsregler, namespace, API-versioner eller sparade värden som bieffekt av en flytt.
- Frontendflaggor är inte behörigheter. Skydda backendens anrop och användaridentitet med tester.
- Baselinefiler får bara krympa efter initialt införande. Utöka inte dem för att få en kontroll grön.
- Håll mekaniska flyttar och beteendeändringar åtskilda. Beskriv problem, ägare, acceptans,
  verifiering och återställning innan en större ändring.
- Följ användarens lokala resursregler. Kör fokuserade kontroller; fulla byggen, servrar och
  browsertester kräver uttrycklig beställning för den sortens körning.

En färdig ändring ska förklara vilket ansvar som blev tydligare, vilka dubbla vägar som försvann,
vilket beteende som testats och vilka kontroller som fortfarande återstår.
