import {
  BASE_URL_PREFIX,
  CREDENTIALS,
  LOG_FORMAT,
  NODE_ENV,
  ORIGIN,
  PORT,
  SAML_CALLBACK_URL,
  SAML_ENTRY_SSO,
  SAML_FAILURE_REDIRECT,
  SAML_FAILURE_REDIRECT_MESSAGE,
  SAML_IDP_PUBLIC_CERT,
  SAML_ISSUER,
  SAML_LOGOUT_CALLBACK_URL,
  SAML_LOGOUT_REDIRECT,
  SAML_PRIVATE_KEY,
  SAML_PUBLIC_KEY,
  SAML_SUCCESS_REDIRECT,
  SECRET_KEY,
  SESSION_MEMORY,
  SWAGGER_ENABLED,
} from '@config';
import errorMiddleware from '@middlewares/error.middleware';
import { PrismaClient } from '@prisma/client';
import { logger, stream } from '@utils/logger';
import bodyParser from 'body-parser';
import { defaultMetadataStorage } from 'class-transformer/cjs/storage';
import { validationMetadatasToSchemas } from 'class-validator-jsonschema';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import hpp from 'hpp';
import createMemoryStore from 'memorystore';
import morgan from 'morgan';
import passport from 'passport';
import { Strategy, VerifiedCallback } from '@node-saml/passport-saml';
import 'reflect-metadata';
import { getMetadataArgsStorage, useExpressServer } from 'routing-controllers';
import { routingControllersToSpec } from 'routing-controllers-openapi';
import createFileStore from 'session-file-store';
import swaggerUi from 'swagger-ui-express';
import { HttpException } from './exceptions/HttpException';
import { Profile } from './interfaces/profile.interface';
import ApiService from '@services/api.service';
import { authorizeGroups, getPermissions, getRole } from './services/authorization.service';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { additionalConverters } from './utils/custom-validation-classes';

const SessionStoreCreate = SESSION_MEMORY ? createMemoryStore(session) : createFileStore(session);
const sessionTTL = 4 * 24 * 60 * 60;
// NOTE: memory uses ms while file uses seconds
const sessionStore = new SessionStoreCreate(SESSION_MEMORY ? { checkPeriod: sessionTTL * 1000 } : { ttl: sessionTTL, path: './data/sessions' });

const prisma = new PrismaClient();

const apiService = new ApiService();

passport.serializeUser(function (user, done) {
  done(null, user);
});
passport.deserializeUser(function (user, done) {
  done(null, user);
});

const samlStrategy = new Strategy(
  {
    disableRequestedAuthnContext: true,
    //attributeConsumingServiceIndex: '2',
    //xmlSignatureTransforms: ['test'],
    //authnContext: ['urn:oasis:names:tc:SAML:2.0:ac:classes:unspecified'],
    // identifierFormat: 'urn:oasis:names:tc:SAML:2.0:nameid-format:transient',
    identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified',
    callbackUrl: SAML_CALLBACK_URL,
    entryPoint: SAML_ENTRY_SSO,
    //decryptionPvk: SAML_PRIVATE_KEY,
    privateKey: SAML_PRIVATE_KEY,
    // Identity Provider's public key
    idpCert: SAML_IDP_PUBLIC_CERT,
    issuer: SAML_ISSUER,
    wantAssertionsSigned: false,
    signatureAlgorithm: 'sha256',
    digestAlgorithm: 'sha256',
    // maxAssertionAgeMs: 2592000000,
    // authnRequestBinding: 'HTTP-POST',
    //logoutUrl: 'http://194.71.24.30/sso',
    logoutCallbackUrl: SAML_LOGOUT_CALLBACK_URL,
    acceptedClockSkewMs: -1,
    wantAuthnResponseSigned: false,
    audience: false,
  },
  async function (profile: Profile, done: VerifiedCallback) {
    if (!profile) {
      return done({
        name: 'SAML_MISSING_PROFILE',
        message: 'Missing SAML profile',
      });
    }
    // Depending on using Onegate or ADFS for federation the profile data looks a bit different
    // Here we use the null coalescing operator (??) to handle both cases.
    // (A switch from Onegate to ADFS was done on august 6 2023 due to problems in MobilityGuard.)
    //
    // const { givenName, sn, email, groups } = profile;
    const givenName = profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'] ?? profile['givenName'];
    const sn = profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname'] ?? profile['sn'];
    const email = profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ?? profile['email'];
    const groups = profile['http://schemas.xmlsoap.org/claims/Group']?.join(',') ?? profile['groups'];
    const username = profile['urn:oid:0.9.2342.19200300.100.1.1'];

    if (!givenName || !sn || !email || !groups || !username) {
      logger.error(
        'Could not extract necessary profile data fields from the IDP profile. Does the Profile interface match the IDP profile response? The profile response may differ, for example Onegate vs ADFS.',
      );
      return done(null, null, {
        name: 'SAML_MISSING_ATTRIBUTES',
        message: 'Missing profile attributes',
      });
    }

    if (!authorizeGroups(groups)) {
      logger.error('Group authorization failed. Is the user a member of the authorized groups?');
      return done(null, null, {
        name: 'SAML_MISSING_GROUP',
        message: 'SAML_MISSING_GROUP',
      });
    }

    const groupList: string[] = groups !== undefined ? (groups.split(',').map(x => x.toLowerCase()) as string[]) : [];

    const appGroups: string[] = groupList.length > 0 ? groupList : [];

    try {
      const findUser = {
        name: `${givenName} ${sn}`,
        firstName: givenName,
        lastName: sn,
        username: username,
        email: email,
        groups: appGroups,
        role: getRole(appGroups),
        permissions: getPermissions(appGroups),
      };

      logger.info('Found user:', findUser);

      const userSettings = await prisma.userSettings.findFirst({ where: { username: findUser.username } });
      // Create user settings for new users
      const data = {
        username: findUser.username,
        readNotificationsClearedDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
      };
      if (!userSettings) {
        await prisma.userSettings.create({
          data,
        });
      }

      done(null, findUser);
    } catch (err) {
      if (err instanceof HttpException && err?.status === 404) {
        // TODO: Handle missing person form Citizen?
        logger.error('Error when calling Citizen:');
        logger.error(err);
      }
      done(err);
    }
  },
  async function (profile: Profile, done: VerifiedCallback) {
    return done(null, {});
  },
);

class App {
  public app: express.Application;
  public env: string;
  public port: string | number;
  public swaggerEnabled: boolean;

  constructor(Controllers: Function[]) {
    this.app = express();
    this.env = NODE_ENV || 'development';
    this.port = PORT || 3000;
    this.swaggerEnabled = SWAGGER_ENABLED || false;

    this.initializeDataFolders();

    this.initializeMiddlewares();
    this.initializeRoutes(Controllers);
    if (this.swaggerEnabled) {
      this.initializeSwagger(Controllers);
    }
    this.initializeErrorHandling();
  }

  public listen() {
    this.app.listen(this.port, () => {
      logger.info(`=================================`);
      logger.info(`======= ENV: ${this.env} =======`);
      logger.info(`🚀 App listening on the port ${this.port}`);
      logger.info(`=================================`);
    });
  }

  public getServer() {
    return this.app;
  }

  private initializeMiddlewares() {
    this.app.use(morgan(LOG_FORMAT, { stream }));
    this.app.use(hpp());
    this.app.use(helmet());
    this.app.use(compression());
    this.app.use(express.json({ limit: '500kb' }));
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(cookieParser());

    this.app.use(
      session({
        secret: SECRET_KEY,
        resave: false,
        saveUninitialized: false,
        store: sessionStore,
        cookie: {
          path: BASE_URL_PREFIX,
        },
      }),
    );

    this.app.use(passport.initialize());
    this.app.use(passport.session());
    passport.use('saml', samlStrategy);

    this.app.get(
      `${BASE_URL_PREFIX}/saml/login`,
      (req, res, next) => {
        if (req.session.returnTo) {
          req.query.RelayState = req.session.returnTo;
        }
        next();
      },
      (req, res, next) => {
        passport.authenticate('saml', {
          failureRedirect: SAML_FAILURE_REDIRECT,
        })(req, res, next);
      },
    );

    this.app.get(`${BASE_URL_PREFIX}/saml/metadata`, (req, res) => {
      res.type('application/xml');
      const metadata = samlStrategy.generateServiceProviderMetadata(SAML_PUBLIC_KEY, SAML_PUBLIC_KEY);
      res.status(200).send(metadata);
    });

    this.app.get(`${BASE_URL_PREFIX}/saml/logout`, bodyParser.urlencoded({ extended: false }), (req, res, next) => {
      samlStrategy.logout(req as any, () => {
        req.logout(err => {
          if (err) {
            return next(err);
          }
          // FIXME: should we redirect here or should client do it?
          res.redirect(SAML_LOGOUT_REDIRECT);
        });
      });
    });

    this.app.get(`${BASE_URL_PREFIX}/saml/logout/callback`, bodyParser.urlencoded({ extended: false }), (req, res, next) => {
      // FIXME: is this enough or do we need to do something more?
      req.logout(err => {
        if (err) {
          return next(err);
        }
        // FIXME: should we redirect here or should client do it?
        res.redirect(SAML_LOGOUT_REDIRECT);
      });
    });

    // To handle failure on backend, failureRedirect here
    // this.app.get(`${BASE_URL_PREFIX}/saml/login/failure`, bodyParser.urlencoded({ extended: false }), (req, res, next) => {
    //   res.redirect(SAML_FAILURE_REDIRECT_MESSAGE);
    // });

    this.app.post(
      `${BASE_URL_PREFIX}/saml/login/callback`,
      bodyParser.urlencoded({ extended: false }),
      (req, res, next) => {
        passport.authenticate('saml', {
          successReturnToOrRedirect: SAML_SUCCESS_REDIRECT,
          failureRedirect: SAML_FAILURE_REDIRECT_MESSAGE,
          failureMessage: true,
        })(req, res, next);
      },
      (req, res) => {
        res.redirect(SAML_SUCCESS_REDIRECT);
      },
    );
  }

  private initializeRoutes(controllers: Function[]) {
    useExpressServer(this.app, {
      routePrefix: BASE_URL_PREFIX,
      cors: {
        origin: ORIGIN,
        credentials: CREDENTIALS,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      },
      controllers: controllers,
      defaultErrorHandler: false,
    });
  }

  private initializeSwagger(controllers: Function[]) {
    const schemas = validationMetadatasToSchemas({
      classTransformerMetadataStorage: defaultMetadataStorage,
      refPointerPrefix: '#/components/schemas/',
      additionalConverters: additionalConverters,
    });

    const routingControllersOptions = {
      routePrefix: `${BASE_URL_PREFIX}`,
      controllers: controllers,
    };

    const storage = getMetadataArgsStorage();
    const spec = routingControllersToSpec(storage, routingControllersOptions, {
      components: {
        schemas: schemas as { [schema: string]: unknown },
        securitySchemes: {
          basicAuth: {
            scheme: 'basic',
            type: 'http',
          },
        },
      },
      info: {
        title: `Proxy API`,
        description: '',
        version: '1.0.0',
      },
    });

    this.app.use(`${BASE_URL_PREFIX}/swagger.json`, (req, res) => res.json(spec));
    this.app.use(`${BASE_URL_PREFIX}/api-docs`, swaggerUi.serve, swaggerUi.setup(spec));
  }

  private initializeErrorHandling() {
    this.app.use(errorMiddleware);
  }

  private initializeDataFolders() {
    const databaseDir: string = join(__dirname, '../data/database');
    if (!existsSync(databaseDir)) {
      mkdirSync(databaseDir, { recursive: true });
    }
    const logsDir: string = join(__dirname, '../data/logs');
    if (!existsSync(logsDir)) {
      mkdirSync(logsDir, { recursive: true });
    }
    const sessionsDir: string = join(__dirname, '../data/sessions');
    if (!existsSync(sessionsDir)) {
      mkdirSync(sessionsDir, { recursive: true });
    }
  }
}

export default App;
