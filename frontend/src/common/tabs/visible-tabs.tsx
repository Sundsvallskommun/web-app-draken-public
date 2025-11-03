import { IErrand } from '@casedata/interfaces/errand';
import { ErrandPhase, UiPhase } from '@casedata/interfaces/errand-phase';
import { getUiPhase, isFTErrand } from '@casedata/services/casedata-errand-service';
import { getOwnerStakeholder } from '@casedata/services/casedata-stakeholder-service';
import { getApplicationEnvironment, isPT } from '@common/services/application-service';
import { appConfig } from '@config/appconfig';

interface TabItem {
  label: string;
  path: string;
  visible: boolean;
}

export const supportManagementTabs = (errandnumber: string): TabItem[] => [
  { label: 'Grundinformation', path: `/arende/${errandnumber}/grundinformation`, visible: true },
  {
    label: 'Ärendeuppgifter',
    path: `/arende/${errandnumber}/arendeuppgifter`,
    visible: appConfig.features.useDetailsTab,
  },
  { label: 'Meddelanden', path: `/arende/${errandnumber}/meddelanden`, visible: true },
  { label: 'Bilagor', path: `/arende/${errandnumber}/bilagor`, visible: true },
  {
    label: 'Rekryteringsprocess',
    path: `/arende/${errandnumber}/rekryteringsprocess`,
    visible: appConfig.features.useRecruitment,
  },
  {
    label: 'Fakturering',
    path: `/arende/${errandnumber}/grunduppgifter`,
    visible: appConfig.features.useBilling,
  },
];

export const caseDataTabs = (errand: IErrand, assets: any[] = []): TabItem[] => {
  return [
    {
      label: 'Grundinformation',
      path: `/arende/${errand?.errandNumber}/grundinformation`,
      visible: true,
    },
    {
      label: 'Ärendeuppgifter',
      path: `/arende/${errand?.errandNumber}/arendeuppgifter`,
      visible: true,
    },
    {
      label: `Meddelanden`,
      path: `/arende/${errand?.errandNumber}/meddelanden`,
      visible: true,
    },
    {
      label: `Bilagor`,
      path: `/arende/${errand?.errandNumber}/bilagor`,
      visible: true,
    },
    ...(getApplicationEnvironment() === 'TEST'
      ? [
          {
            label: 'Avtal',
            path: `/arende/${errand?.errandNumber}/avtal`,
            visible:
              !isPT() &&
              [
                ErrandPhase.utredning,
                ErrandPhase.beslut,
                ErrandPhase.hantera,
                ErrandPhase.verkstalla,
                ErrandPhase.uppfoljning,
                ErrandPhase.canceled,
                ErrandPhase.overklagad,
              ].includes(errand?.phase),
          },
        ]
      : []),
    {
      label: `Tillstånd & tjänster (${assets.length})`,
      path: `/arende/${errand?.errandNumber}/tillstand-tjanster`,
      visible:
        isPT() &&
        [
          ErrandPhase.aktualisering,
          ErrandPhase.utredning,
          ErrandPhase.beslut,
          ErrandPhase.hantera,
          ErrandPhase.verkstalla,
          ErrandPhase.uppfoljning,
          ErrandPhase.canceled,
          ErrandPhase.overklagad,
        ].includes(errand?.phase),
    },
    {
      label: 'Utredning',
      path: `/arende/${errand?.errandNumber}/utredning`,

      visible:
        isPT() &&
        [
          ErrandPhase.utredning,
          ErrandPhase.beslut,
          ErrandPhase.hantera,
          ErrandPhase.verkstalla,
          ErrandPhase.uppfoljning,
          ErrandPhase.canceled,
          ErrandPhase.overklagad,
        ].includes(errand?.phase),
    },
    {
      label: 'Insatser',
      path: `/arende/${errand?.errandNumber}/insatser`,
      visible: isFTErrand(errand) && getUiPhase(errand) !== UiPhase.registrerad && !!getOwnerStakeholder(errand),
    },
    {
      label: 'Beslut',
      path: `/arende/${errand?.errandNumber}/beslut`,
      visible: [
        ErrandPhase.beslut,
        ErrandPhase.hantera,
        ErrandPhase.verkstalla,
        ErrandPhase.uppfoljning,
        ErrandPhase.overklagad,
      ].includes(errand?.phase),
    },
  ];
};
