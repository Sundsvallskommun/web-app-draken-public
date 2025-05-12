import { IndexController } from '@controllers/index.controller';
import validateEnv from '@utils/validateEnv';
import App from './app';
import { ActiveDirectoryController } from './controllers/active-directory.controller';
import { AddressController } from './controllers/address.controller';
import { AssetController } from './controllers/asset.controller';
import { BillingController } from './controllers/billing.controller';
import { CaseDataAttachmentController } from './controllers/casedata/casedata-attachment.controller';
import { CaseDataDecisionsController } from './controllers/casedata/casedata-decision.controller';
import { CaseDataErrandController } from './controllers/casedata/casedata-errand.controller';
import { caseDataFacilitiesController } from './controllers/casedata/casedata-facilities.controller';
import { CaseDataHistoryController } from './controllers/casedata/casedata-history.controller';
import { CasedataNotesController } from './controllers/casedata/casedata-notes.controller';
import { CasedataNotificationController } from './controllers/casedata/casedata-notification-controller';
import { CasedataStakeholderController } from './controllers/casedata/casedata-stakeholder.controller';
import { CasedataContractsController } from './controllers/contract.controller';
import { EstateInfoController } from './controllers/estateInfo.controller';
import { HealthController } from './controllers/health.controller';
import { MessageController } from './controllers/message.controller';
import { SupportAttachmentController } from './controllers/supportmanagement/support-attachment.controller';
import { SupportErrandController } from './controllers/supportmanagement/support-errand.controller';
import { SupportFacilitiesController } from './controllers/supportmanagement/support-facilities.controller';
import { SupportHistoryController } from './controllers/supportmanagement/support-history.controller';
import { SupportMessageController } from './controllers/supportmanagement/support-message.controller';
import { SupportMetadataController } from './controllers/supportmanagement/support-metadata.controller';
import { SupportNoteController } from './controllers/supportmanagement/support-note.controller';
import { SupportNotificationController } from './controllers/supportmanagement/support-notification-controller';
import { TemplateController } from './controllers/template.controller';
import { UserController } from './controllers/user.controller';
import { ExportController } from '@controllers/export.controller';

validateEnv();

const app = new App([
  ActiveDirectoryController,
  AddressController,
  AssetController,
  BillingController,
  CaseDataAttachmentController,
  CasedataContractsController,
  CaseDataDecisionsController,
  CaseDataErrandController,
  caseDataFacilitiesController,
  CaseDataHistoryController,
  CasedataNotesController,
  CasedataNotificationController,
  CasedataStakeholderController,
  EstateInfoController,
  ExportController,
  HealthController,
  IndexController,
  MessageController,
  SupportAttachmentController,
  SupportErrandController,
  SupportFacilitiesController,
  SupportHistoryController,
  SupportMessageController,
  SupportMetadataController,
  SupportNoteController,
  SupportNotificationController,
  TemplateController,
  UserController,
]);

app.listen();
