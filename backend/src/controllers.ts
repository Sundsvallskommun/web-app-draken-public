import { ExportController } from '@controllers/export.controller';
import { IndexController } from '@controllers/index.controller';

import { ActiveDirectoryController } from './controllers/active-directory.controller';
import { AddressController } from './controllers/address.controller';
import { AssetController } from './controllers/asset.controller';
import { BillingController } from './controllers/billing.controller';
import { BillingDataCollectorController } from './controllers/billingdatacollector.controller';
import { CaseDataAttachmentController } from './controllers/casedata/casedata-attachment.controller';
import { CaseDataConversationController } from './controllers/casedata/casedata-conversation.controller';
import { CaseDataDecisionsController } from './controllers/casedata/casedata-decision.controller';
import { CaseDataDecisionAttachmentController } from './controllers/casedata/casedata-decision-attachment.controller';
import { CaseDataErrandController } from './controllers/casedata/casedata-errand.controller';
import { caseDataFacilitiesController } from './controllers/casedata/casedata-facilities.controller';
import { CaseDataHistoryController } from './controllers/casedata/casedata-history.controller';
import { CasedataNotesController } from './controllers/casedata/casedata-notes.controller';
import { CasedataNotificationController } from './controllers/casedata/casedata-notification.controller';
import { CasedataStakeholderController } from './controllers/casedata/casedata-stakeholder.controller';
import { ExtraParameterController } from './controllers/casedata/extraparameter.controller';
import { CaseStatusController } from './controllers/casestatus.controller';
import { CasedataContractsController } from './controllers/contract.controller';
import { EmployeeController } from './controllers/employee.controller';
import { EstateInfoController } from './controllers/estateInfo.controller';
import { FeatureFlagController } from './controllers/featureflag.controller';
import { HealthController } from './controllers/health.controller';
import { JsonSchemaController } from './controllers/jsonschema.controller';
import { MessageController } from './controllers/message.controller';
import { OrganizationController } from './controllers/organization.controller';
import { RelationsController } from './controllers/relations.controller';
import { SupportAttachmentController } from './controllers/supportmanagement/support-attachment.controller';
import { SupportConversationController } from './controllers/supportmanagement/support-conversation.controller';
import { SupportErrandController } from './controllers/supportmanagement/support-errand.controller';
import { SupportExportController } from './controllers/supportmanagement/support-export.controller';
import { SupportFacilitiesController } from './controllers/supportmanagement/support-facilities.controller';
import { SupportHandoverController } from './controllers/supportmanagement/support-handover.controller';
import { SupportHistoryController } from './controllers/supportmanagement/support-history.controller';
import { SupportMessageController } from './controllers/supportmanagement/support-message.controller';
import { SupportMetadataController } from './controllers/supportmanagement/support-metadata.controller';
import { SupportNoteController } from './controllers/supportmanagement/support-note.controller';
import { SupportNotificationController } from './controllers/supportmanagement/support-notification.controller';
import { SupportSubscriptionController } from './controllers/supportmanagement/support-subscription.controller';
import { TemplateController } from './controllers/template.controller';
import { UserController } from './controllers/user.controller';

/**
 * Every controller registered with routing-controllers.
 *
 * Kept in its own module so server.ts and the default-deny auth tests consume the same
 * list - a controller added to the app is therefore always covered by the auth tests,
 * and cannot be missed because the test kept a separate copy.
 */
export const CONTROLLERS: NewableFunction[] = [
  ActiveDirectoryController,
  AddressController,
  AssetController,
  BillingController,
  BillingDataCollectorController,
  CaseDataAttachmentController,
  CaseDataConversationController,
  CaseDataDecisionAttachmentController,
  CaseDataDecisionsController,
  CaseDataErrandController,
  caseDataFacilitiesController,
  CaseDataHistoryController,
  CasedataContractsController,
  CasedataNotesController,
  CasedataNotificationController,
  CasedataStakeholderController,
  CaseStatusController,
  EmployeeController,
  EstateInfoController,
  ExportController,
  ExtraParameterController,
  FeatureFlagController,
  HealthController,
  IndexController,
  JsonSchemaController,
  MessageController,
  OrganizationController,
  RelationsController,
  SupportAttachmentController,
  SupportConversationController,
  SupportErrandController,
  SupportExportController,
  SupportFacilitiesController,
  SupportHandoverController,
  SupportHistoryController,
  SupportMessageController,
  SupportMetadataController,
  SupportNoteController,
  SupportNotificationController,
  SupportSubscriptionController,
  TemplateController,
  UserController,
];
