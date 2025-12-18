import '@cypress/code-coverage/support'
import { addMatchImageSnapshotCommand } from '@simonsmith/cypress-image-snapshot/command';

addMatchImageSnapshotCommand({
  failureThreshold: 0.3,
  failureThresholdType: 'percent',
  capture: 'viewport',
  comparisonMethod: 'ssim',
});
