import { ExportController } from '@controllers/export.controller';

import { CaseDataAttachmentController } from '@/controllers/casedata/casedata-attachment.controller';
import { CaseDataConversationController } from '@/controllers/casedata/casedata-conversation.controller';
import { CaseDataDecisionsController } from '@/controllers/casedata/casedata-decision.controller';
import { CaseDataDecisionAttachmentController } from '@/controllers/casedata/casedata-decision-attachment.controller';
import { CaseDataErrandController } from '@/controllers/casedata/casedata-errand.controller';
import { caseDataFacilitiesController } from '@/controllers/casedata/casedata-facilities.controller';
import { CaseDataHistoryController } from '@/controllers/casedata/casedata-history.controller';
import { CasedataNotesController } from '@/controllers/casedata/casedata-notes.controller';
import { CasedataNotificationController } from '@/controllers/casedata/casedata-notification.controller';
import { CasedataStakeholderController } from '@/controllers/casedata/casedata-stakeholder.controller';
import { ExtraParameterController } from '@/controllers/casedata/extraparameter.controller';
import { CasedataContractsController } from '@/controllers/contract.controller';
import { MessageController } from '@/controllers/message.controller';

import { SHARED_CONTROLLERS } from './shared-controllers';

export const CASEDATA_CONTROLLERS: NewableFunction[] = [
  ...SHARED_CONTROLLERS,
  CaseDataAttachmentController,
  CasedataContractsController,
  CaseDataDecisionAttachmentController,
  CaseDataDecisionsController,
  CaseDataErrandController,
  caseDataFacilitiesController,
  CaseDataHistoryController,
  CasedataNotesController,
  CasedataNotificationController,
  CasedataStakeholderController,
  ExportController,
  MessageController,
  CaseDataConversationController,
  ExtraParameterController,
];
