import { SupportApplicationProfileController } from '@/controllers/supportmanagement/support-application-profile.controller';
import { SupportAttachmentController } from '@/controllers/supportmanagement/support-attachment.controller';
import { SupportConversationController } from '@/controllers/supportmanagement/support-conversation.controller';
import { SupportErrandController } from '@/controllers/supportmanagement/support-errand.controller';
import { SupportExportController } from '@/controllers/supportmanagement/support-export.controller';
import { SupportFacilitiesController } from '@/controllers/supportmanagement/support-facilities.controller';
import { SupportHandoverController } from '@/controllers/supportmanagement/support-handover.controller';
import { SupportHistoryController } from '@/controllers/supportmanagement/support-history.controller';
import { SupportMessageController } from '@/controllers/supportmanagement/support-message.controller';
import { SupportMetadataController } from '@/controllers/supportmanagement/support-metadata.controller';
import { SupportNoteController } from '@/controllers/supportmanagement/support-note.controller';
import { SupportNotificationController } from '@/controllers/supportmanagement/support-notification.controller';

import { SHARED_CONTROLLERS } from './shared-controllers';

export const SUPPORT_CONTROLLERS: NewableFunction[] = [
  ...SHARED_CONTROLLERS,
  SupportAttachmentController,
  SupportErrandController,
  SupportExportController,
  SupportFacilitiesController,
  SupportHandoverController,
  SupportHistoryController,
  SupportApplicationProfileController,
  SupportMessageController,
  SupportMetadataController,
  SupportNoteController,
  SupportNotificationController,
  SupportConversationController,
];
