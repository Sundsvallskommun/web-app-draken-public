import { IndexController } from '@controllers/index.controller';

import { ActiveDirectoryController } from '@/controllers/active-directory.controller';
import { AddressController } from '@/controllers/address.controller';
import { AssetController } from '@/controllers/asset.controller';
import { BillingController } from '@/controllers/billing.controller';
import { BillingDataCollectorController } from '@/controllers/billingdatacollector.controller';
import { CaseStatusController } from '@/controllers/casestatus.controller';
import { EmployeeController } from '@/controllers/employee.controller';
import { EstateInfoController } from '@/controllers/estateInfo.controller';
import { FeatureFlagController } from '@/controllers/featureflag.controller';
import { HealthController } from '@/controllers/health.controller';
import { JsonSchemaController } from '@/controllers/jsonschema.controller';
import { OrganizationController } from '@/controllers/organization.controller';
import { RelationsController } from '@/controllers/relations.controller';
import { TemplateController } from '@/controllers/template.controller';
import { UserController } from '@/controllers/user.controller';

export const SHARED_CONTROLLERS: NewableFunction[] = [
  ActiveDirectoryController,
  AddressController,
  AssetController,
  BillingController,
  BillingDataCollectorController,
  EstateInfoController,
  HealthController,
  IndexController,
  TemplateController,
  UserController,
  RelationsController,
  CaseStatusController,
  JsonSchemaController,
  FeatureFlagController,
  EmployeeController,
  OrganizationController,
];
