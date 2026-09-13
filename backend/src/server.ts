import { createSessionStore } from '@utils/session-store';

import App from '@/shell/app';
import { CONTROLLERS } from '@/shell/controllers';
import validateEnv from '@/shell/validate-environment';

validateEnv();

(async () => {
  const sessionStore = await createSessionStore();

  const app = new App(CONTROLLERS, sessionStore);

  app.listen();
})();
