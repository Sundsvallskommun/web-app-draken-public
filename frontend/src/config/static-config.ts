export const staticConfig = Object.freeze({
  applicationName: process.env.NEXT_PUBLIC_APPLICATION_NAME || 'appen',
  basePath: process.env.NEXT_PUBLIC_BASEPATH || '',
  municipalityId: process.env.NEXT_PUBLIC_MUNICIPALITY_ID || '',
  application: process.env.NEXT_PUBLIC_APPLICATION || '',
  environment: process.env.NEXT_PUBLIC_ENVIRONMENT || '',
});
