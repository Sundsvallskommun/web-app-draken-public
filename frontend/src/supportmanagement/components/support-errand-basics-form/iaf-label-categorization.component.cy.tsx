import type { Label } from '@common/data-contracts/supportmanagement/data-contracts';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  applyIafLabelClassificationSelection,
  createIafLabelClassificationModel,
  getIafLabelClassificationSelection,
} from '@supportmanagement/investigation/label-classification';
import type { SupportErrand } from '@supportmanagement/services/support-errand-service';
import { getErrandTypeLabel } from '@supportmanagement/services/support-label-classification-service';
import type { SupportMetadata } from '@supportmanagement/services/support-metadata-service';
import { FormProvider, type Resolver, useForm, useFormContext, useWatch } from 'react-hook-form';

import { supportErrandFormSchema } from '../support-errand/support-errand-form-schema';
import { IafLabelCategorization } from './iaf-label-categorization.component';

const medicationAdministration: Label = {
  id: 'medication-administration-id',
  classification: 'type',
  displayName: 'Felaktig administrering',
  resourcePath: 'CATEGORY/HSL/MEDICATION/INCORRECT_ADMINISTRATION',
  resourceName: 'INCORRECT_ADMINISTRATION',
};

const medication: Label = {
  id: 'medication-id',
  classification: 'category',
  displayName: 'Läkemedel',
  resourcePath: 'CATEGORY/HSL/MEDICATION',
  resourceName: 'MEDICATION',
  labels: [
    {
      id: 'medication-dose-id',
      classification: 'type',
      displayName: 'Fel dos',
      resourcePath: 'CATEGORY/HSL/MEDICATION/INCORRECT_DOSE',
      resourceName: 'INCORRECT_DOSE',
    },
    medicationAdministration,
  ],
};

const fallWithoutInjury: Label = {
  id: 'fall-without-injury-id',
  classification: 'category',
  displayName: 'Fall utan skada',
  resourcePath: 'CATEGORY/HSL/FALL_WITHOUT_INJURY',
  resourceName: 'FALL_WITHOUT_INJURY',
  labels: [],
};

const hsl: Label = {
  id: 'hsl-id',
  classification: 'provision-category',
  displayName: 'HSL',
  resourcePath: 'CATEGORY/HSL',
  resourceName: 'HSL',
  labels: [medication, fallWithoutInjury],
};

const solLss: Label = {
  id: 'sol-lss-id',
  classification: 'provision-category',
  displayName: 'SoL/LSS',
  resourcePath: 'CATEGORY/SOL_LSS',
  resourceName: 'SOL_LSS',
  labels: [
    {
      id: 'documentation-id',
      classification: 'category',
      displayName: 'Dokumentation',
      resourcePath: 'CATEGORY/SOL_LSS/DOCUMENTATION',
      resourceName: 'DOCUMENTATION',
      labels: [],
    },
  ],
};

const reportType: Label = {
  id: 'report-type-id',
  classification: 'report-type',
  displayName: 'Avvikelse',
  resourcePath: 'REPORT_TYPE/DEVIATION',
  resourceName: 'DEVIATION',
};

const provision: Label = {
  id: 'provision-id',
  classification: 'provision',
  displayName: 'HSL',
  resourcePath: 'PROVISION/HSL',
  resourceName: 'HSL',
};

const labelStructure: Label[] = [
  {
    id: 'provision-root-id',
    classification: 'provision-root',
    displayName: 'Lagrum',
    resourcePath: 'PROVISION',
    resourceName: 'PROVISION',
    labels: [provision],
  },
  {
    id: 'category-root-id',
    classification: 'category-root',
    displayName: 'Kategori',
    resourcePath: 'CATEGORY',
    resourceName: 'CATEGORY',
    labels: [hsl, solLss],
  },
  {
    id: 'report-type-root-id',
    classification: 'report-type-root',
    displayName: 'Rapporttyp',
    resourcePath: 'REPORT_TYPE',
    resourceName: 'REPORT_TYPE',
    labels: [reportType],
  },
];

const metadata: SupportMetadata = { labels: { labelStructure } };

const FormValues = () => {
  const { control } = useFormContext<SupportErrand>();
  const values = useWatch({ control });
  return <pre data-cy="form-values">{JSON.stringify(values)}</pre>;
};

const ClassificationHarness = ({
  initialCategory = '',
  initialType = '',
  initialSubType = '',
  initialLabels = [provision, reportType],
  classificationMetadata = metadata,
}: {
  initialCategory?: string;
  initialType?: string;
  initialSubType?: string;
  initialLabels?: Label[];
  classificationMetadata?: SupportMetadata;
}) => {
  const supportErrand: SupportErrand = {
    id: 'errand-id',
    category: initialCategory,
    type: initialType,
    subType: initialSubType,
    customer: [],
    contacts: [],
    labels: initialLabels,
  };
  const methods = useForm<SupportErrand>({
    defaultValues: supportErrand,
    resolver: yupResolver(supportErrandFormSchema) as unknown as Resolver<SupportErrand>,
    mode: 'onChange',
  });

  return (
    <FormProvider {...methods}>
      <IafLabelCategorization supportMetadata={classificationMetadata} />
      <FormValues />
    </FormProvider>
  );
};

describe('IAF label categorization', () => {
  it('unwraps CATEGORY and preserves labels outside classification', () => {
    const model = createIafLabelClassificationModel(labelStructure);

    expect(model.catalog.types.map(({ displayName }) => displayName)).to.deep.equal([
      'Dokumentation',
      'Fall utan skada',
      'Läkemedel',
    ]);
    expect(model.catalog.types.map(({ displayName }) => displayName)).not.to.include.members([
      'Kategori',
      'HSL',
      'SoL/LSS',
      'Lagrum',
      'Rapporttyp',
    ]);

    const selectedFromLeaf = getIafLabelClassificationSelection(model, [medicationAdministration], {
      type: 'CATEGORY/SOL_LSS/DOCUMENTATION',
    });
    expect(selectedFromLeaf).to.deep.equal({
      typeCode: medication.resourcePath,
      subtypeCode: medicationAdministration.resourcePath,
    });
    expect(
      getIafLabelClassificationSelection(model, [], {
        category: hsl.resourcePath,
        type: medication.resourcePath,
      })
    ).to.deep.equal({ typeCode: medication.resourcePath, subtypeCode: undefined });

    const update = applyIafLabelClassificationSelection(model, [provision, reportType], selectedFromLeaf);
    expect(update.category).to.equal(hsl.resourcePath);
    expect(update.type).to.equal(medication.resourcePath);
    expect(update.subType).to.equal(medicationAdministration.resourcePath);
    expect(update.requiresSubType).to.equal(true);
    expect(update.labelsChanged).to.equal(true);
    expect(update.labels.map(({ resourcePath }) => resourcePath)).to.deep.equal([
      provision.resourcePath,
      reportType.resourcePath,
      hsl.resourcePath,
      medication.resourcePath,
      medicationAdministration.resourcePath,
    ]);
    expect(update.labels.every(({ labels }) => labels === undefined)).to.equal(true);
    expect(getErrandTypeLabel({ labels: update.labels }, metadata)?.displayName).to.equal('Läkemedel');
    expect(applyIafLabelClassificationSelection(model, update.labels, selectedFromLeaf).labelsChanged).to.equal(false);

    const terminalUpdate = applyIafLabelClassificationSelection(model, update.labels, {
      typeCode: fallWithoutInjury.resourcePath,
    });
    expect(terminalUpdate.requiresSubType).to.equal(false);
    expect(terminalUpdate.subType).to.equal('');
    expect(terminalUpdate.labels.map(({ resourcePath }) => resourcePath)).to.deep.equal([
      provision.resourcePath,
      reportType.resourcePath,
      hsl.resourcePath,
      fallWithoutInjury.resourcePath,
    ]);
  });

  it('renders the requested two-field classification and saves the hidden owner path', () => {
    cy.mount(<ClassificationHarness />);

    cy.contains('h3', 'Kategorisering').should('be.visible');
    cy.contains('Välj avvikelsetyp och detaljerad typ för att klassificera ärendet.').should('be.visible');
    cy.contains('Avvikelsetyp (obligatoriskt)').should('be.visible');
    cy.contains('Huvudkategori för avvikelsen').should('be.visible');
    cy.contains('Underkategori (obligatorisk)').should('be.visible');
    cy.contains('Underkategori för avvikelsen').should('be.visible');
    cy.contains('Verksamhet').should('not.exist');

    cy.get('[data-cy="label-classification-type"]')
      .find('option')
      .then(($options) => {
        expect([...$options].map((option) => option.textContent)).to.include.members([
          'Läkemedel',
          'Fall utan skada',
          'Dokumentation',
        ]);
        expect([...$options].map((option) => option.textContent)).not.to.include.members([
          'Kategori',
          'HSL',
          'SoL/LSS',
        ]);
      });

    cy.get('[data-cy="label-classification-type"]').select(medication.resourcePath!);
    cy.get('[data-cy="label-classification-subtype-error"]').should('contain.text', 'Välj underkategori');
    cy.get('[data-cy="label-classification-subtype"]').select(medicationAdministration.resourcePath!);
    cy.get('[data-cy="label-classification-subtype-error"]').should('not.exist');

    cy.get('[data-cy="form-values"]')
      .invoke('text')
      .then((value) => {
        const formValues = JSON.parse(value) as SupportErrand;
        expect(formValues.category).to.equal(hsl.resourcePath);
        expect(formValues.type).to.equal(medication.resourcePath);
        expect(formValues.subType).to.equal(medicationAdministration.resourcePath);
        expect(formValues.labels?.map(({ resourcePath }) => resourcePath)).to.deep.equal([
          provision.resourcePath,
          reportType.resourcePath,
          hsl.resourcePath,
          medication.resourcePath,
          medicationAdministration.resourcePath,
        ]);
      });
  });

  it('restores a main category from legacy classification paths and still requires its undercategory', () => {
    cy.mount(<ClassificationHarness initialCategory={hsl.resourcePath} initialType={medication.resourcePath} />);

    cy.get('[data-cy="label-classification-type"]').should('have.value', medication.resourcePath);
    cy.get('[data-cy="label-classification-subtype-error"]').should('contain.text', 'Välj underkategori');
    cy.get('[data-cy="form-values"]')
      .invoke('text')
      .then((value) => {
        const formValues = JSON.parse(value) as SupportErrand;
        expect(formValues.labels?.map(({ resourcePath }) => resourcePath)).to.deep.equal([
          provision.resourcePath,
          reportType.resourcePath,
          hsl.resourcePath,
          medication.resourcePath,
        ]);
      });
  });

  it('preserves an unknown persisted category while metadata is unavailable', () => {
    const legacyCategory: Label = {
      id: 'legacy-category-id',
      classification: 'category',
      displayName: 'Äldre kategori',
      resourcePath: 'CATEGORY/HSL/LEGACY_CATEGORY',
      resourceName: 'LEGACY_CATEGORY',
    };

    cy.mount(
      <ClassificationHarness
        initialCategory={hsl.resourcePath}
        initialType={legacyCategory.resourcePath}
        initialLabels={[provision, reportType, legacyCategory]}
        classificationMetadata={{ labels: { labelStructure: [] } }}
      />
    );

    cy.get('[data-cy="form-values"]')
      .invoke('text')
      .then((value) => {
        const formValues = JSON.parse(value) as SupportErrand;
        expect(formValues.category).to.equal(hsl.resourcePath);
        expect(formValues.type).to.equal(legacyCategory.resourcePath);
        expect(formValues.labels?.map(({ resourcePath }) => resourcePath)).to.deep.equal([
          provision.resourcePath,
          reportType.resourcePath,
          legacyCategory.resourcePath,
        ]);
      });
  });
});
