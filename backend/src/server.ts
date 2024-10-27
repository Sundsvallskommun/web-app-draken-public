import { IndexController } from '@controllers/index.controller';
import validateEnv from '@utils/validateEnv';
import App from './app';
import { ActiveDirectoryController } from './controllers/active-directory.controller';
import { AddressController } from './controllers/address.controller';
import { CaseDataAttachmentController } from './controllers/casedata/casedata-attachment.controller';
import { CaseDataDecisionsController } from './controllers/casedata/casedata-decision.controller';
import { CaseDataErrandController } from './controllers/casedata/casedata-errand.controller';
import { caseDataFacilitiesController } from './controllers/casedata/casedata-facilities.controller';
import { CaseDataHistoryController } from './controllers/casedata/casedata-history.controller';
import { CasedataNotesController } from './controllers/casedata/casedata-notes.controller';
import { CasedataStakeholderController } from './controllers/casedata/casedata-stakeholder.controller';
import { estateInfoController } from './controllers/estateInfo.controller';
import { HealthController } from './controllers/health.controller';
import { MessageController } from './controllers/message.controller';
import { SupportAttachmentController } from './controllers/supportmanagement/support-attachment.controller';
import { SupportErrandController } from './controllers/supportmanagement/support-errand.controller';
import { SupportHistoryController } from './controllers/supportmanagement/support-history.controller';
import { SupportMessageController } from './controllers/supportmanagement/support-message.controller';
import { SupportMetadataController } from './controllers/supportmanagement/support-metadata.controller';
import { SupportNoteController } from './controllers/supportmanagement/support-note.controller';
import { TemplateController } from './controllers/template.controller';
import { UserController } from './controllers/user.controller';
import { CasedataContractsController } from './controllers/contract.controller';
import { SupportNotificationController } from './controllers/supportmanagement/support-notification-controller';
import { SupportFacilitiesController } from './controllers/supportmanagement/support-facilities.controller';
import { AssetController } from './controllers/asset.controller';
import { CaseDataAppealController } from './controllers/casedata/casedata-appeal.controller';

validateEnv();

const app = new App([
  IndexController,
  CaseDataErrandController,
  CasedataStakeholderController,
  CaseDataAttachmentController,
  CaseDataAppealController,
  AddressController,
  estateInfoController,
  UserController,
  CasedataNotesController,
  caseDataFacilitiesController,
  TemplateController,
  CaseDataDecisionsController,
  MessageController,
  CaseDataHistoryController,
  SupportErrandController,
  SupportMessageController,
  SupportNoteController,
  SupportAttachmentController,
  SupportMetadataController,
  ActiveDirectoryController,
  SupportHistoryController,
  CasedataContractsController,
  SupportNotificationController,
  SupportFacilitiesController,
  AssetController,
  HealthController,
]);

app.listen();
