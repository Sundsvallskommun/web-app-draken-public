import { CasedataMessagesTab } from '@casedata/components/errand/tabs/messages/casedata-messages-tab';
import { CasedataOverviewTab } from '@casedata/components/errand/tabs/overview/casedata-overview-tab';
import { IErrand } from '@casedata/interfaces/errand';
import { ErrandPhase, UiPhase } from '@casedata/interfaces/errand-phase';
import { getErrand, phaseChangeInProgress } from '@casedata/services/casedata-errand-service';
import { countUnreadMessages, fetchMessages, fetchMessagesTree } from '@casedata/services/casedata-message-service';
import { useAppContext } from '@common/contexts/app.context';
import { getApplicationEnvironment, isMEX, isPT } from '@common/services/application-service';
import WarnIfUnsavedChanges from '@common/utils/warnIfUnsavedChanges';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { Tabs, useSnackbar } from '@sk-web-gui/react';
import React, { useEffect, useState } from 'react';
import { UseFormReturn, useFormContext } from 'react-hook-form';
import { CasedataAttachments } from './tabs/attachments/casedata-attachments.component';
import { CasedataContractTab } from './tabs/contract/casedata-contract-tab';
import { CasedataDecisionTab } from './tabs/decision/casedata-decision-tab';
import { CasedataDetailsTab } from './tabs/details/casedata-details-tab';
import { CasedataInvestigationTab } from './tabs/investigation/casedata-investigation-tab';
import { CasedataPermitServicesTab } from './tabs/permits-services/casedata-permits-services-tab';
import { getAssets } from '@casedata/services/asset-service';
import { CasedataAppealTab } from './tabs/appeal/casedata-appeal-tab';
import { ErrandStatus } from '@casedata/interfaces/errand-status';

export const CasedataTabsWrapper: React.FC = () => {
  const { municipalityId, errand, setErrand, messages, setMessages, setMessageTree, setAssets, assets, uiPhase } =
    useAppContext();
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [unsavedUppgifter, setUnsavedUppgifter] = useState(false);
  const [unsavedContract, setUnsavedContract] = useState(false);
  const [unsavedUtredning, setUnsavedUtredning] = useState(false);
  const [unsavedDecision, setUnsavedDecision] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const toastMessage = useSnackbar();

  const methods: UseFormReturn<IErrand, any, undefined> = useFormContext();

  useEffect(() => {
    if (errand && errand.errandNumber) {
      fetchMessages(municipalityId, errand)
        .then(setMessages)
        .catch((e) => {
          toastMessage({
            position: 'bottom',
            closeable: false,
            message: 'Något gick fel när meddelanden hämtades',
            status: 'error',
          });
        });
      fetchMessagesTree(municipalityId, errand)
        .then(setMessageTree)
        .catch((e) => {
          toastMessage({
            position: 'bottom',
            closeable: false,
            message: 'Något gick fel när meddelanden hämtades',
            status: 'error',
          });
        });
      isPT() &&
        errand.stakeholders.find((p) => p.roles.includes('APPLICANT'))?.personId &&
        getAssets(errand.stakeholders.find((p) => p.roles.includes('APPLICANT')).personId, 'PARKINGPERMIT')
          .then((res) => setAssets(res.data))
          .catch((e) => {
            toastMessage({
              position: 'bottom',
              closeable: false,
              message: 'Något gick fel när Tillstånd och tjänster hämtades',
              status: 'error',
            });
          });
    }

    if (errand.id && phaseChangeInProgress(errand)) {
      setTimeout(() => {
        getErrand(municipalityId, errand.id.toString())
          .then((res) => {
            setErrand(res.errand);
          })
          .catch((e) => {
            toastMessage({
              position: 'bottom',
              closeable: false,
              message: `Något gick fel när ärendet skulle hämtas`,
              status: 'error',
            });
          });
      }, 2000);
    }
  }, [errand]);

  useEffect(() => {
    // Need to define these variables for validation/dirty check to work??
    const _ = Object.keys(methods.formState.dirtyFields).length;
    const __ = methods.formState.isDirty;
    setUnsavedChanges(Object.keys(methods.formState.dirtyFields).length === 0 ? false : methods.formState.isDirty);
  }, [methods.getValues()]);

  const tabs: {
    label: string;
    content: React.ReactNode;
    disabled: boolean;
    visibleFor: ErrandPhase[];
  }[] = [
    {
      label: 'Grunduppgifter',
      content: (
        <CasedataOverviewTab
          errand={errand}
          registeringNewErrand={typeof errand?.id === 'undefined'}
          setUnsaved={(u) => {
            setUnsavedChanges(u);
          }}
          update={() => {}}
        />
      ),
      disabled: false,
      visibleFor: [
        ErrandPhase.aktualisering,
        ErrandPhase.utredning,
        ErrandPhase.beslut,
        ErrandPhase.hantera,
        ErrandPhase.verkstalla,
        ErrandPhase.uppfoljning,
        ErrandPhase.canceled,
        ErrandPhase.overklagad,
      ],
    },
    {
      label: 'Ärendeuppgifter',
      content: (
        <CasedataDetailsTab
          registeringNewErrand={typeof errand?.id === 'undefined'}
          setUnsaved={setUnsavedUppgifter}
          update={() => {}}
        />
      ),
      disabled: false,
      visibleFor: errand?.id
        ? [
            ErrandPhase.aktualisering,
            ErrandPhase.utredning,
            ErrandPhase.beslut,
            ErrandPhase.hantera,
            ErrandPhase.verkstalla,
            ErrandPhase.uppfoljning,
            ErrandPhase.canceled,
            ErrandPhase.overklagad,
          ]
        : [],
    },
    {
      label: `Bilagor (${(errand?.attachments && errand?.attachments.length) || 0})`,
      content: errand && <CasedataAttachments />,
      disabled: !errand?.id,
      visibleFor: errand?.id
        ? [
            ErrandPhase.aktualisering,
            ErrandPhase.utredning,
            ErrandPhase.beslut,
            ErrandPhase.overklagad,
            ErrandPhase.hantera,
            ErrandPhase.verkstalla,
            ErrandPhase.uppfoljning,
            ErrandPhase.canceled,
            ErrandPhase.overklagad,
          ]
        : [],
    },
    ...(getApplicationEnvironment() === 'TEST'
      ? [
          {
            label: 'Avtal',
            content: <CasedataContractTab setUnsaved={setUnsavedContract} update={() => {}} />,
            disabled: false,
            visibleFor:
              !isPT() && errand?.id
                ? [
                    ErrandPhase.utredning,
                    ErrandPhase.beslut,
                    ErrandPhase.hantera,
                    ErrandPhase.verkstalla,
                    ErrandPhase.uppfoljning,
                    ErrandPhase.canceled,
                    ErrandPhase.overklagad,
                  ]
                : [],
          },
        ]
      : []),
    {
      label: `Tillstånd & tjänster ${assets && assets.length !== 0 ? `(${assets.length})` : '(0)'}`,
      content: errand?.id && <CasedataPermitServicesTab />,
      disabled: !errand?.id,
      visibleFor:
        isPT() && errand?.id
          ? [
              ErrandPhase.aktualisering,
              ErrandPhase.utredning,
              ErrandPhase.beslut,
              ErrandPhase.hantera,
              ErrandPhase.verkstalla,
              ErrandPhase.uppfoljning,
              ErrandPhase.canceled,
              ErrandPhase.overklagad,
            ]
          : [],
    },
    {
      label: `Meddelanden (${countUnreadMessages(messages)})`,
      content: errand?.id && (
        <CasedataMessagesTab
          setUnsaved={() => {}}
          update={() =>
            setTimeout(() => {
              getErrand(municipalityId, errand.id.toString())
                .then((res) => {
                  setErrand(res.errand);
                  return res;
                })
                .then((res) => fetchMessagesTree(municipalityId, errand).then(setMessages))
                .catch((e) => {
                  toastMessage({
                    position: 'bottom',
                    closeable: false,
                    message: `Något gick fel när ärendet skulle hämtas`,
                    status: 'error',
                  });
                });
            }, 500)
          }
        />
      ),
      disabled: !errand?.id,
      visibleFor: errand?.id
        ? [
            ErrandPhase.aktualisering,
            ErrandPhase.utredning,
            ErrandPhase.beslut,
            ErrandPhase.hantera,
            ErrandPhase.verkstalla,
            ErrandPhase.uppfoljning,
            ErrandPhase.canceled,
            ErrandPhase.overklagad,
          ]
        : [],
    },
    {
      label: `Utredning`,
      content: errand?.id && <CasedataInvestigationTab errand={errand} setUnsaved={() => {}} />,
      disabled: !errand?.id,
      visibleFor:
        isPT() && errand?.id
          ? [
              ErrandPhase.aktualisering,
              ErrandPhase.utredning,
              ErrandPhase.beslut,
              ErrandPhase.hantera,
              ErrandPhase.verkstalla,
              ErrandPhase.uppfoljning,
              ErrandPhase.canceled,
              ErrandPhase.overklagad,
            ]
          : [],
    },
    {
      label: 'Beslut',
      content: errand && (
        <CasedataDecisionTab
          setUnsaved={setUnsavedDecision}
          update={() =>
            getErrand(municipalityId, errand.id.toString())
              .then((res) => setErrand(res.errand))
              .catch((e) => {
                toastMessage({
                  position: 'bottom',
                  closeable: false,
                  message: `Något gick fel när ärendet skulle hämtas`,
                  status: 'error',
                });
              })
          }
        />
      ),
      disabled: !errand?.id,
      visibleFor: errand?.id
        ? [
            ErrandPhase.beslut,
            ErrandPhase.hantera,
            ErrandPhase.verkstalla,
            ErrandPhase.uppfoljning,
            ErrandPhase.overklagad,
          ]
        : [],
    },
    {
      label: `Överklagan (${(errand?.appeals && errand?.appeals.length) || 0})`,
      content: errand && <CasedataAppealTab />,
      disabled: !errand?.id,
      visibleFor:
        isPT() && errand?.id
          ? errand.status === ErrandStatus.ArendeAvslutat
            ? [ErrandPhase.aktualisering]
            : [
                ErrandPhase.beslut,
                ErrandPhase.hantera,
                ErrandPhase.verkstalla,
                ErrandPhase.uppfoljning,
                ErrandPhase.canceled,
                ErrandPhase.overklagad,
              ]
          : [],
    },
  ];

  const [current, setCurrent] = React.useState<number | undefined>(0);

  let currentTab = current;

  switch (uiPhase) {
    case UiPhase.granskning:
      tabs
        .filter((t) => t.visibleFor.includes(errand.phase))
        .forEach((tab, idx) => {
          if (tab.label === 'Grunduppgifter') {
            currentTab = idx;
          }
        });
      break;
    case UiPhase.utredning:
      tabs
        .filter((t) => t.visibleFor.includes(errand.phase))
        .forEach((tab, idx) => {
          if (tab.label === 'Utredning') {
            currentTab = idx;
          }
        });
      break;
    case UiPhase.beslut:
    case UiPhase.slutfor:
      tabs
        .filter((t) => t.visibleFor.includes(errand.phase))
        .forEach((tab, idx) => {
          if (tab.label === 'Beslut') {
            currentTab = idx;
          }
        });
      break;
    default:
      currentTab = current;
  }

  return (
    <>
      <div className="mb-xl">
        {showVerification ? (
          <div className="flex flex-col items-center justify-center my-lg">
            <div className="text-3xl text-secondary my-sm">
              <CheckCircleOutlineIcon fontSize="inherit" className="mr-sm" />
            </div>
            <div className="text-lg my-sm">Ärendet har sparats</div>
          </div>
        ) : (
          <WarnIfUnsavedChanges showWarning={unsavedChanges || unsavedUppgifter || unsavedUtredning || unsavedDecision}>
            <Tabs
              className="border-1 rounded-12 bg-background-content pt-6 pl-0"
              tabslistClassName="border-0 border-red-500 -m-b-12 flex-wrap"
              panelsClassName="border-t-1"
              // TODO uncomment to set Avtal tab to be active when in TEST environment
              // current={getApplicationEnvironment() === 'TEST' ? 3 : current}
              current={currentTab}
              onTabChange={() => {}}
              size={'sm'}
            >
              {tabs
                .filter((tab) => tab.visibleFor.includes(errand.phase) || !errand.phase)
                .map((tab, index) => (
                  <Tabs.Item key={tab.label}>
                    <Tabs.Button disabled={tab.disabled} className="text-small">
                      {tab.label}
                    </Tabs.Button>
                    <Tabs.Content>{tab.content}</Tabs.Content>
                  </Tabs.Item>
                ))}
            </Tabs>
          </WarnIfUnsavedChanges>
        )}
      </div>
    </>
  );
};