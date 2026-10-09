# PBI as stakeholder data

**Status:** Reviewed, decisions taken (2026-10-09)
**Branch:** refactor/DRAKEN-5121-personlig-lamplighet, based on PR #1222
**Background:** the review of PR #1222 and the discussion that followed

## Background

PR #1222 builds Persons of Significant Influence (PBI) as a BFF resource of its own: four endpoints in
`support-pbi.controller.ts` that read the errand, look up engagements in LegalEntity, translate personal numbers to
party ids through Citizen, and write the stakeholder list with If-Match. The frontend keeps two local lists
(candidates and people), fetches them from the BFF, and keeps them in step with a signal in the store. Every PBI
write re-reads the errand and resets the form so that the next Spara ärende does not write away what was just written.

All of that exists because there are two writers of the same stakeholder list: the form and the PBI endpoints.
Every finding in the review (dropped parameters, stale snapshot, re-read, signal) came from there.

The data that actually exists is two things:

- **The errand with its stakeholders.** PBI state is already just parameters on the stakeholder (`PBI`,
  `PBI_SOURCE`, `PBI_ROLE`, `PBI_ASSESSMENT`, `PBI_ASSESSMENT_COMMENT`). The errand fetch also enriches every
  stakeholder with a personal number from Citizen (`support-errand.controller.ts:415-449`, the `personNumber` field
  on the form model).
- **The engagements from LegalEntity**, with the personal number in `identity.code`. The route
  `GET /legalentity/:partyId/engagements` already exists in `address.controller.ts:203` but has no frontend caller.

With personal numbers on both sides the frontend can match stakeholders to engagements itself. The engagement table
becomes a convenient way to add stakeholders, not a data source of its own.

## Goals

- **One writer.** PBI marking, role and assessment are fields on the stakeholder in the form and are saved by
  Spara ärende like everything else in Grundinformation.
- **No PBI resource in the BFF.** `support-pbi.controller.ts` is removed. What remains is what existed before the
  PR: the engagements route and `searchPerson`.
- **No duplication in Grundinformation.** PBI shows on the stakeholder card, not in a separate list.
- **The investigation cards read and write the form.** No local copy, no signal, no re-read.

## Principle

```
engagements (LegalEntity)  --personal number-->  stakeholder in the form  --Spara ärende-->  Support Management
         table: pick a person                        PBI parameters                      whole list, as today
```

- **Marking in the table** = add a stakeholder (`CONTACT`, `PRIVATE`, party id and name from `searchPerson`,
  parameters `PBI` and `PBI_SOURCE=COMPANY`). If the person is already a stakeholder, only the parameters are set.
- **Adding by hand** = the same with `PBI_SOURCE=MANUAL` and an optional `PBI_ROLE`.
- **Unmarking / removing** = if the stakeholder has `PBI_SOURCE` it existed only for the marking and is removed from
  the list. Without `PBI_SOURCE` it was an existing stakeholder (applicant, contact person) and only the PBI
  parameters are removed.
- **The table's checkboxes** are read from the form: an engagement is marked when some stakeholder with `PBI` has
  the same personal number. The comparison normalises to twelve digits without a dash.
- **The assessment** is written to `PBI_ASSESSMENT` / `PBI_ASSESSMENT_COMMENT` on the stakeholder with
  `setValue(..., { shouldDirty: true })`. Spara ärende sends it. The builder already carries every parameter the
  form does not own (`FORM_OWNED_STAKEHOLDER_PARAMETERS`).
- **Everything is form state until saved.** A mark in the table is "unsaved" the same way a new contact person is.
  This is a deliberate change from the PR, where the mark was saved immediately.

## Out of scope

- Moving all PBI handling into Personlig lämplighet. The orderer has said the placement is preliminary; this plan
  keeps the table in Grundinformation and the cards in Utredning, but makes the move cheap since both read the same
  form fields.
- Changes in Support Management or in how Spara ärende writes the stakeholder list (see
  `docs/jira/2026-10-09-intressentlistan-skrivs-bara-vid-andring.md`, which this plan makes less urgent but not
  redundant).
- Other drakes. Everything stays behind `useCompanyInformation` and the investigation flag, as in the PR.

## Decisions

Taken on 2026-10-09, after review of the first draft:

1. **Lägg till PBI** sits under the engagement table in Grundinformation and in the section in Utredning.
2. **PBI on the stakeholder card** is a "PBI" badge with the role on the same row, plus a separate unmark button
   for stakeholders that existed before the marking.
3. **Unsaved stakeholder changes block "Redo för beslut".** Mirror `dirtyFields.contacts` / `.customer` into
   `unsavedTabs.basics`, so the gate holds for every stakeholder change, not only PBI.
4. **Existing dev errands** marked under the PR's version lack `PBI_SOURCE` and will be treated as pre-existing
   stakeholders on unmark (parameters removed, stakeholder stays). Left as is.
5. **`PBI_SOURCE` keeps two values**, `COMPANY` and `MANUAL`.

## Steps

### Step 1 - A pure PBI module over the form model

New `frontend/src/supportmanagement/services/support-pbi-service.ts` replacing today's. Pure functions over
`SupportStakeholderFormModel` and `LegalEntityEngagement`, no calls:

- `isPbi(stakeholder)`, `pbiOf(stakeholder)` → `{ source, role, assessment, comment }`
- `withPbi(stakeholder, { source, role? })`, `withoutPbi(stakeholder)`,
  `withAssessment(stakeholder, { assessment, comment })`, each returning a new stakeholder with all other
  parameters untouched
- `normalizeIdentity(code)` → twelve digits, `engagementIsMarked(engagement, stakeholders)`,
  `stakeholderForEngagement(engagement, stakeholders)`
- `pbiPeople(customer, contacts)` → the stakeholders that are PBI, in the order the cards show them
- constants: parameter keys, `PBI_SOURCE` values, assessment values, `SUPPORT_PARAMETER_VALUE_MAX_LENGTH`

The engagements fetch goes in `common/services/legal-entity-service.ts` next to `getCompanyProfileByPartyId`:
`getLegalEntityEngagements(partyId)` against the existing route. `engagementRoles` is already there.

Tests: personal number format variants, marked/unmarked, removal with and without `PBI_SOURCE`, an assessment
leaving role and source alone. Takes over what `support-pbi.controller.test.ts` covers today.

### Step 2 - Grundinformation reads and writes the form

- `use-support-pbi.ts` is rewritten: reads `customer` and `contacts` with `watch`, fetches engagements once per
  organisation party id, and exposes `candidates` (engagement + `marked` + `stakeholder`), `mark(engagement)`,
  `unmark(stakeholder)`, `addByHand(person)`. All three change `contacts` through `setValue` with `shouldDirty`.
  `mark` calls `searchPerson(personalNumber)` for party id and name; if the lookup fails the row shows
  "Kan inte slås upp i folkbokföringen" as today.
- `SupportErrandPbiCell` and `SupportErrandCompanyEngagements` stay, `PbiMarking` takes the engagement instead of
  a party id. `busyPartyId` is only needed during `searchPerson`.
- `SupportPbiAddDialog` stays, returns `{ partyId, name, personNumber, role? }`.
- `SupportPbiDisclosure` and `SupportPbiList` are removed. Instead the stakeholder card in
  `support-contacts.component.tsx` gets a PBI badge and the role when `isPbi` is true. The card's trash can does
  what it already does: removes the stakeholder. A stakeholder that existed before the marking gets a separate
  unmark button on the card (decision 2); unchecking in the table also works when the person is in it.
- `AddPbiButton` moves to `SupportErrandCompanySection`, under the table (decision 1).
- `pbiSignal`, `setPbiSignal`, `use-announce-support-pbi-write.ts` and `use-add-support-pbi-by-hand.ts` are
  removed. The notice "Spara ändringarna av ärendets intressenter innan du ändrar PBI-markeringar" is no longer
  needed.
- Mirror `dirtyFields.contacts` / `.customer` into `unsavedTabs.basics` (decision 3). The sidebar's own disabled
  state already follows form dirtiness; this is for the step button's gate and the leave-tab dialog.

### Step 3 - Personlig lämplighet over the form

- `SupportPersonalSuitabilitySection` reads `pbiPeople(watch('customer'), watch('contacts'))` and writes with
  `withAssessment` + `setValue`. `people`, `loaded`, `absorb`, `saveRef` and `onEdited` go.
- Personal number and name come from the stakeholder (`personNumber`, `firstName`/`lastName`). The company role is
  looked up in the engagements through the same hook as the table, so a person from the company data shows
  "Styrelseledamot" and a hand-added one shows `PBI_ROLE`.
- The add button in the section uses the same `addByHand` as Grundinformation.
- Validation "comment without assessment": a `validate` rule registered on the card's field, so `formState.isValid`
  turns false and Spara ärende is already disabled, with the message on the card. The toast and `saveAll` go.
- The `tabSavers` registration in the investigation tab stays for statements and the conclusion. The suitability
  part of `save` and `suitabilityEdited` are removed.

### Step 4 - The BFF

- Remove `support-pbi.controller.ts`, its test, its registration in `controllers.ts`, and
  `mockSecondaryPersonNumber` in `mock-data.ts` if nothing else uses it.
- Leave `address.controller.ts` as it is. Check that `/legalentity/:partyId/engagements` answers for the AoT client
  in dev; until now it has only been called from inside the BFF.
- Knip backend and frontend green without exceptions.

### Step 5 - Texts, test guide and cleanup

- `common.json`: remove the keys for the list and the re-read, keep the dialog, the table, the cards and the
  validation. Add the badge text.
- Rewrite the PR description's sections "PBI:erna som eget scope", "Personnummer sparas aldrig", "Signalen är
  enkelriktad", "En tyst dataförlust" and the BFF table. Test guide: steps 3-4, 10-12 and 17-18 change because the
  marking is now saved with Spara ärende.
- `docs/jira/2026-10-09-intressentlistan-skrivs-bara-vid-andring.md`: update the background. The problem remains
  in principle, but PBI is no longer a second writer.

## Risks

- **The enrichment is best-effort.** If the Citizen lookup fails for a stakeholder it has no `personNumber` and is
  not matched against the table even though it is marked. Show the card anyway (it only reads parameters) and leave
  the table row unchecked with a "cannot be matched" state. Same class of failure as today's "unresolved".
- **No validation in the BFF.** Assessment values and lengths are validated only in the frontend. Support
  Management rejects values over 3000 characters; an unknown assessment value would pass. Acceptable for an internal
  handler view; otherwise the `updateSupportErrand` path in the BFF can get a check on `PBI_ASSESSMENT`.
- **`setValue('contacts', ...)` replaces the whole array.** That is how `support-contacts.component.tsx` already
  works, so the pattern is established, but card order has to come from the list, not from array index.
- **Several `searchPerson` lookups** when several rows are ticked in quick succession. One at a time, with
  `busyPartyId`, as today.

## Verification

Unit tests per step (steps 1 and 3 carry most of it). Manual run through the rewritten test guide against
dev.test:3016/AOT with AOT-26100036 and an errand with a private person as applicant. Lint and type check at the end
of each step, the test suites only once a step is done.
