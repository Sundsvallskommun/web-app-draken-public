/**
 * OBS: Denna fritextshantering finns på grund av begränsningar i e-tjänsten openE.
 * openE saknar stöd för den specialhantering vi byggt i denna applikation med
 * x antal resor med egna strukturerade fält. Vi kan därför inte bygga reslistan
 * som vi vill för ärenden som kommer in den vägen – openE löser det i stället med
 * ett enda fritextfält. Den här mallen speglar den begränsningen.
 */
import { UppgiftField } from '@casedata/services/casedata-extra-parameters-service';

import { notificationNational_UppgiftFieldTemplate } from './paratransit-notification-national';

// Nyckeln som fritextfältet läser/sparar. E-tjänsten skickar in restexten på denna
// extraParameter-nyckel. Måste matcha exakt det e-tjänsten skickar.
export const NATIONAL_ESERVICE_JOURNEY_FIELD = 'personal.journeyText';

// Variant av den nationella riksfärdtjänstmallen (Ansökan riksfärdtjänst) som används
// när ärendet kommit in via e-tjänsten (Channels.ESERVICE). E-tjänsten saknar stöd för
// den strukturerade reslistan (x antal resor med egna fält), så där anges resorna som en
// enda fritext. Här byts därför den repeterbara journey-gruppen mot ett textarea-fält.
export const nationalEservice_UppgiftFieldTemplate: UppgiftField[] = notificationNational_UppgiftFieldTemplate.map(
  (field) =>
    field.field === 'personal.journey'
      ? ({
          field: NATIONAL_ESERVICE_JOURNEY_FIELD,
          value: '',
          label: 'Resor',
          description:
            'Ange vilken kommun och vilken ort du ska åka från och till. Ange även vilket datum resan ska ske. Vet du inte exakt datum anger du månad.',
          formField: {
            type: 'textarea',
          },
          section: 'Yttre omständigheter',
          required: true,
        } as UppgiftField)
      : field
);
