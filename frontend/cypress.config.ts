import { defineConfig } from 'cypress';

export default defineConfig({
  retries: 2,
  e2e: {
    supportFile: false,
    baseUrl: `http://localhost:${process.env.PORT || '3000'}${process.env.NEXT_PUBLIC_BASEPATH || ''}`,
    env: {
      apiUrl: `${process.env.NEXT_PUBLIC_API_URL}`,
      application_name: `${process.env.NEXT_PUBLIC_APPLICATION}`,
      // IMPORTANT
      // The value below is a test person number from Skatteverket, it is not a real person number
      mockPersonNumber: '199001012385',
      // The value below is an invalid test person number for testing validation, it is not a real person number
      mockInvalidPersonNumber: '199001012386',
      // The value below is a non existing test person number for testing validation, it is not a real person number
      mockNonexistentPersonNumber: '199909092380',
      // The value below is an organization number for testing validation, it is not a organization number
      mockOrganizationNumber: '556026-9986',
      mockInvalidOrganizationNumber: '556026-9987',
      // The value below is a test email, it is not a real email
      mockEmail: 'a@example.com',
      // The value below is a test email, it is not a real email
      mockRecipientEmail: ' mail@example.com',
      // The value below is a test phone number from Post- och telestyrelsen, it is not a real phone number
      mockPhoneNumber: '0701740635',
      // The value below is a test phone number from Post- och telestyrelsen, it is not a real phone number
      mockPhoneNumberCountryCode: '+46701740635',
      // The value below is a test username, it is not a real username
      mockAdUsername: 'abc01abc',
    },
    viewportWidth: 1440,
    viewportHeight: 1024,
    video: false,
    screenshotOnRunFailure: false,
    // The line below is needed to fix an intermittent error where
    // Cypress for some reason bypasses the route intercept and tries to
    // fetch from real backend instead, resulting in a 401 (since cypress is not
    // authorized). The error occurs seldomly and several tests in a suite may
    // pass when suddenly the tenth, eleventh, or.. fails.
    chromeWebSecurity: false,
    setupNodeEvents(on, config) {
      require('@cypress/code-coverage/task')(on, config);
      // const wp = require('@cypress/webpack-preprocessor');
      // // include any other plugin code...
      // const webpackOptions = {
      //   resolve: {
      //     extensions: ['.ts', '.tsx', '.js', '.jsx'],
      //   },
      //   module: {
      //     rules: [
      //       {
      //         test: /\.tsx?$/,
      //         exclude: /node_modules/,
      //         loader: 'ts-loader',
      //       },
      //     ],
      //   },
      // };
      // on('file:preprocessor', wp({ webpackOptions }));

      // It's IMPORTANT to return the config object
      // with any changed environment variables
      return config;
    },
  },

  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack',
    },
  },
});
