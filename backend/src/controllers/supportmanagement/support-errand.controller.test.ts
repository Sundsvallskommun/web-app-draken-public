import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Response } from 'express';

import type { Label } from '@/data-contracts/supportmanagement/data-contracts';
import { HttpException } from '@/exceptions/HttpException';
import { RequestWithUser } from '@/interfaces/auth.interface';
import { User } from '@/interfaces/users.interface';
import ApiService from '@/services/api.service';

import {
  buildSupportErrandClassificationUpdateBody,
  buildSupportErrandUpdateBody,
  resolveSupportErrandClassification,
  SupportErrandController,
  SupportErrandDto,
  UpdateSupportErrandClassificationDto,
} from './support-errand.controller';

const user: User = {
  id: 1,
  personId: 'person-id',
  name: 'Test User',
  firstName: 'Test',
  lastName: 'User',
  email: 'test.user@example.com',
  password: '',
  username: 'testuser',
  groups: [],
  permissions: {
    canEditCasedata: false,
    canEditSupportManagement: true,
    canViewAttestations: false,
    canEditAttestations: false,
  },
};

interface ResponseState {
  status?: number;
  body?: unknown;
}

const createRequest = (): RequestWithUser => ({ user }) as unknown as RequestWithUser;

const createResponse = (): { response: Response; state: ResponseState } => {
  const state: ResponseState = {};
  const response = {
    status(status: number) {
      state.status = status;
      return response;
    },
    send(body: unknown) {
      state.body = body;
      return response;
    },
  } as unknown as Response;

  return { response, state };
};

describe('SupportErrandDto write boundary', () => {
  it('accepts the optimistic locking version returned on existing parameters', async () => {
    const payload = plainToInstance(SupportErrandDto, {
      parameters: [
        {
          key: 'eventType',
          values: ['DEVIATION'],
          version: 1,
        },
        {
          key: 'eventConcerns',
          values: ['PERSON'],
          version: 2,
        },
      ],
    });

    const validationErrors = await validate(payload, { whitelist: true, forbidNonWhitelisted: true });

    assert.deepEqual(validationErrors, []);
  });

  it('omits read-only parameter versions from the Support Management update body', () => {
    const updateBody = buildSupportErrandUpdateBody({
      title: 'Categorized errand',
      parameters: [
        {
          key: 'eventType',
          values: ['DEVIATION'],
          version: 1,
        },
        {
          key: 'eventConcerns',
          values: ['PERSON'],
          version: 2,
        },
      ],
    });

    assert.deepEqual(updateBody, {
      title: 'Categorized errand',
      parameters: [
        { key: 'eventType', values: ['DEVIATION'] },
        { key: 'eventConcerns', values: ['PERSON'] },
      ],
    });
  });

  it('rejects jsonParameters so the generic errand PATCH cannot overwrite document arrays', async () => {
    const payload = plainToInstance(SupportErrandDto, {
      title: 'Allowed errand update',
      jsonParameters: [
        {
          key: 'avvikelse-plats-handelse',
          schemaId: '2281_avvikelse-plats-handelse_1.0',
          value: { description: 'Must stay read-only here' },
        },
      ],
    });

    const validationErrors = await validate(payload, { whitelist: true, forbidNonWhitelisted: true });

    assert.ok(validationErrors.some(error => error.property === 'jsonParameters'));
  });
});

describe('Support errand classification write boundary', () => {
  beforeEach(() => mock.restoreAll());

  const classificationLabelStructure: Label[] = [
    {
      id: 'category-root-id',
      classification: 'CATEGORY_ROOT',
      resourceName: 'CATEGORY',
      resourcePath: 'CATEGORY',
      labels: [
        {
          id: 'category-owner-id',
          classification: 'PROVISION_CATEGORY',
          resourceName: 'HSL',
          resourcePath: 'CATEGORY/HSL',
          labels: [
            {
              id: 'category-label-id',
              classification: 'CATEGORY',
              resourceName: 'REHAB',
              resourcePath: 'CATEGORY/HSL/REHAB',
              labels: [
                {
                  id: 'type-label-id',
                  classification: 'TYPE',
                  resourceName: 'MISSED',
                  resourcePath: 'CATEGORY/HSL/REHAB/MISSED',
                },
                {
                  id: 'other-type-label-id',
                  classification: 'TYPE',
                  resourceName: 'OTHER',
                  resourcePath: 'CATEGORY/HSL/REHAB/OTHER',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'report-type-id',
      classification: 'REPORT_TYPE_ROOT',
      resourceName: 'REPORT_TYPE',
      resourcePath: 'REPORT_TYPE',
      labels: [
        {
          id: 'deviation-id',
          classification: 'REPORT_TYPE',
          resourceName: 'DEVIATION',
          resourcePath: 'REPORT_TYPE/DEVIATION',
        },
      ],
    },
  ];

  it('accepts only classification and label id references', async () => {
    const validPayload = plainToInstance(UpdateSupportErrandClassificationDto, {
      expectedVersion: 7,
      classification: { category: 'HSL', type: 'REHAB' },
      categoryLabels: [{ id: 'label-id' }],
    });
    const invalidPayload = plainToInstance(UpdateSupportErrandClassificationDto, {
      expectedVersion: -1,
      classification: { category: 'HSL', type: 'REHAB', displayName: 'Not writable' },
      categoryLabels: [{ id: 'label-id', displayName: 'Not writable' }],
      labels: [{ id: 'stale-full-label-list-is-not-writable' }],
      title: 'Not writable',
    });

    assert.deepEqual(await validate(validPayload, { whitelist: true, forbidNonWhitelisted: true }), []);

    const validationErrors = await validate(invalidPayload, { whitelist: true, forbidNonWhitelisted: true });
    const serializedErrors = JSON.stringify(validationErrors);
    assert.match(serializedErrors, /title/);
    assert.match(serializedErrors, /displayName/);
  });

  it('rejects empty classification values and an empty label selection', async () => {
    const payload = plainToInstance(UpdateSupportErrandClassificationDto, {
      expectedVersion: -1,
      classification: { category: '', type: '' },
      categoryLabels: [],
    });

    const validationErrors = await validate(payload, { whitelist: true, forbidNonWhitelisted: true });
    const serializedErrors = JSON.stringify(validationErrors);

    assert.match(serializedErrors, /category/);
    assert.match(serializedErrors, /type/);
    assert.match(serializedErrors, /categoryLabels/);
    assert.match(serializedErrors, /expectedVersion/);
  });

  it('resolves only the exact owner/category/type ids from the metadata CATEGORY tree', () => {
    assert.deepEqual(
      resolveSupportErrandClassification(
        {
          classification: { category: 'CATEGORY/HSL', type: 'CATEGORY/HSL/REHAB' },
          categoryLabels: [{ id: 'type-label-id' }, { id: 'category-owner-id' }, { id: 'category-label-id' }],
        },
        classificationLabelStructure,
      ),
      {
        classification: { category: 'CATEGORY/HSL', type: 'CATEGORY/HSL/REHAB' },
        categoryLabels: [{ id: 'category-owner-id' }, { id: 'category-label-id' }, { id: 'type-label-id' }],
        managedCategoryLabelIds: ['category-root-id', 'category-owner-id', 'category-label-id', 'type-label-id', 'other-type-label-id'],
      },
    );
  });

  it('returns canonical metadata paths instead of persisting normalized client strings', () => {
    assert.deepEqual(
      resolveSupportErrandClassification(
        {
          classification: { category: '  category/hsl ', type: '/category/hsl/rehab/' },
          categoryLabels: [{ id: 'category-owner-id' }, { id: 'category-label-id' }, { id: 'type-label-id' }],
        },
        classificationLabelStructure,
      ).classification,
      { category: 'CATEGORY/HSL', type: 'CATEGORY/HSL/REHAB' },
    );
  });

  it('uses resource names when classification metadata omits optional resource paths', () => {
    const structureWithoutPaths = structuredClone(classificationLabelStructure);
    const removePaths = (labels: Label[]) => {
      labels.forEach(label => {
        delete label.resourcePath;
        if (label.labels) removePaths(label.labels);
      });
    };
    removePaths(structureWithoutPaths);

    const resolved = resolveSupportErrandClassification(
      {
        classification: { category: 'HSL', type: 'REHAB' },
        categoryLabels: [{ id: 'category-owner-id' }, { id: 'category-label-id' }, { id: 'type-label-id' }],
      },
      structureWithoutPaths,
    );

    assert.deepEqual(resolved.classification, { category: 'HSL', type: 'REHAB' });
    assert.deepEqual(resolved.categoryLabels, [{ id: 'category-owner-id' }, { id: 'category-label-id' }, { id: 'type-label-id' }]);
  });

  it('ignores CATEGORY-classified labels outside the CATEGORY metadata root', () => {
    const structureWithForeignCategory = [
      ...classificationLabelStructure,
      {
        id: 'foreign-category-id',
        classification: 'CATEGORY',
        resourceName: 'FOREIGN',
        resourcePath: 'CATEGORY/FOREIGN',
      },
    ];

    assert.throws(
      () =>
        resolveSupportErrandClassification(
          {
            classification: { category: 'CATEGORY/FOREIGN', type: 'CATEGORY/FOREIGN' },
            categoryLabels: [{ id: 'foreign-category-id' }],
          },
          structureWithForeignCategory,
        ),
      (error: unknown) => error instanceof Error && 'status' in error && error.status === 400,
    );
  });

  it('rejects non-category ids and classification paths that do not match metadata', () => {
    assert.throws(
      () =>
        resolveSupportErrandClassification(
          {
            classification: { category: 'CATEGORY/HSL', type: 'CATEGORY/HSL/REHAB' },
            categoryLabels: [{ id: 'category-owner-id' }, { id: 'category-label-id' }, { id: 'deviation-id' }],
          },
          classificationLabelStructure,
        ),
      (error: unknown) => error instanceof Error && 'status' in error && error.status === 400,
    );
    assert.throws(
      () =>
        resolveSupportErrandClassification(
          {
            classification: { category: 'CATEGORY/SOL_LSS', type: 'CATEGORY/HSL/REHAB' },
            categoryLabels: [{ id: 'category-owner-id' }, { id: 'category-label-id' }, { id: 'type-label-id' }],
          },
          classificationLabelStructure,
        ),
      (error: unknown) => error instanceof Error && 'status' in error && error.status === 400,
    );
  });

  it('rejects a known category without exactly one valid undercategory', () => {
    for (const categoryLabels of [
      [{ id: 'category-owner-id' }, { id: 'category-label-id' }],
      [{ id: 'category-owner-id' }, { id: 'category-label-id' }, { id: 'type-label-id' }, { id: 'other-type-label-id' }],
    ]) {
      assert.throws(
        () =>
          resolveSupportErrandClassification(
            {
              classification: { category: 'CATEGORY/HSL', type: 'CATEGORY/HSL/REHAB' },
              categoryLabels,
            },
            classificationLabelStructure,
          ),
        (error: unknown) => error instanceof Error && 'status' in error && error.status === 400,
      );
    }
  });

  it('treats duplicate ids in classification metadata as an upstream contract error', () => {
    const duplicateIdStructure = structuredClone(classificationLabelStructure);
    const firstType = duplicateIdStructure[0]?.labels?.[0]?.labels?.[0]?.labels?.[0];
    assert.ok(firstType);
    firstType.id = 'category-label-id';

    assert.throws(
      () =>
        resolveSupportErrandClassification(
          {
            classification: { category: 'CATEGORY/HSL', type: 'CATEGORY/HSL/REHAB' },
            categoryLabels: [{ id: 'category-owner-id' }, { id: 'category-label-id' }, { id: 'type-label-id' }],
          },
          duplicateIdStructure,
        ),
      (error: unknown) =>
        error instanceof Error &&
        'status' in error &&
        error.status === 502 &&
        error.message === 'Support Management classification metadata contains duplicate label ids',
    );
  });

  it('replaces CATEGORY labels while preserving fresh unrelated labels in the exact upstream body', () => {
    const body = buildSupportErrandClassificationUpdateBody(
      {
        classification: { category: 'HSL', type: 'REHAB', displayName: 'Not writable' },
        categoryLabels: [
          { id: 'new-category-id', displayName: 'Not writable' },
          { id: 'new-category-id', displayName: 'Duplicate' },
          { id: 'new-type-id' },
        ],
        title: 'Not writable',
      } as unknown as UpdateSupportErrandClassificationDto,
      [
        { id: 'provision-id', resourcePath: 'PROVISION/HSL' },
        { id: 'report-type-id', resourcePath: 'REPORT_TYPE/DEVIATION' },
        { id: 'concurrent-location-id', resourcePath: 'LOCATION/NEW_SINCE_PAGE_LOAD' },
        { id: 'old-category-id', resourcePath: 'CATEGORY/HSL/OLD' },
        { id: 'old-type-id', classification: 'TYPE' },
        { id: 'location-type-id', classification: 'TYPE', resourcePath: 'LOCATION/SCHOOL/TYPE' },
      ],
      [{ id: 'new-category-id' }, { id: 'new-category-id' }, { id: 'new-type-id' }],
      { category: 'HSL', type: 'REHAB' },
      ['old-category-id', 'old-type-id', 'new-category-id', 'new-type-id'],
    );

    assert.deepEqual(body, {
      classification: { category: 'HSL', type: 'REHAB' },
      labels: [
        { id: 'provision-id' },
        { id: 'report-type-id' },
        { id: 'concurrent-location-id' },
        { id: 'location-type-id' },
        { id: 'new-category-id' },
        { id: 'new-type-id' },
      ],
    });
  });

  it('stops instead of dropping a fresh unrelated label without an id', () => {
    assert.throws(
      () =>
        buildSupportErrandClassificationUpdateBody(
          {
            classification: { category: 'HSL', type: 'REHAB' },
            categoryLabels: [{ id: 'new-category-id' }],
          },
          [{ resourcePath: 'LOCATION/NEW_SINCE_PAGE_LOAD' }],
        ),
      (error: unknown) =>
        error instanceof Error &&
        'status' in error &&
        error.status === 502 &&
        error.message === 'Support Management response contains an unrelated label without id',
    );
  });

  it('patches only classification and label ids and propagates upstream client errors', async () => {
    const update: UpdateSupportErrandClassificationDto = {
      expectedVersion: 7,
      classification: { category: 'CATEGORY/HSL', type: 'CATEGORY/HSL/REHAB' },
      categoryLabels: [{ id: 'category-owner-id' }, { id: 'category-label-id' }, { id: 'type-label-id' }],
    };
    const currentErrand = {
      id: 'errand-id',
      version: 7,
      labels: [
        { id: 'report-type-id', resourcePath: 'REPORT_TYPE/DEVIATION' },
        { id: 'old-category-id', resourcePath: 'CATEGORY/HSL/OLD' },
      ],
    };
    const savedErrand = {
      id: 'errand-id',
      version: 8,
      classification: update.classification,
      labels: [
        { id: 'report-type-id', classification: 'REPORT-TYPE', resourcePath: 'REPORT_TYPE/DEVIATION' },
        { id: 'category-owner-id', classification: 'PROVISION-CATEGORY', resourcePath: 'CATEGORY/HSL' },
        { id: 'category-label-id', classification: 'CATEGORY', resourcePath: 'CATEGORY/HSL/REHAB' },
        { id: 'type-label-id', classification: 'TYPE', resourcePath: 'CATEGORY/HSL/REHAB/MISSED' },
      ],
    };
    const apiService = new ApiService();
    let readCount = 0;
    const getMock = mock.method(apiService, 'get', async <T>(config: { url?: string }) => {
      if (config.url?.endsWith('/metadata/labels')) {
        return { data: { labelStructure: classificationLabelStructure } as T, message: 'success' };
      }
      return { data: (readCount++ === 0 ? currentErrand : savedErrand) as T, message: 'success' };
    });
    const patchMock = mock.method(apiService, 'patch', async <T>() => ({ data: {} as T, message: 'success' }));
    const controller = new SupportErrandController(apiService);
    const { response, state } = createResponse();

    await controller.updateSupportErrandClassification(createRequest(), 'errand-id', '2281', update, response);

    assert.equal(getMock.mock.callCount(), 3);
    assert.equal(patchMock.mock.callCount(), 1);
    const [config, forwardedUser] = patchMock.mock.calls[0].arguments;
    assert.ok(config);
    assert.match(config.url ?? '', /^2281\/[^/]+\/errands\/errand-id$/);
    assert.deepEqual(config.data, {
      classification: update.classification,
      labels: [{ id: 'report-type-id' }, { id: 'category-owner-id' }, { id: 'category-label-id' }, { id: 'type-label-id' }],
    });
    assert.deepEqual(config.headers, { 'If-Match': '"7"' });
    assert.equal(config.propagateClientError, true);
    assert.equal(forwardedUser, user);
    assert.deepEqual(getMock.mock.calls[0].arguments, [
      { url: config.url, baseURL: config.baseURL, includeResponseHeaders: true, propagateClientError: true },
      user,
    ]);
    const metadataGetConfig = getMock.mock.calls[1].arguments[0] as { propagateClientError?: boolean; url?: string };
    assert.match(metadataGetConfig.url ?? '', /\/metadata\/labels$/);
    assert.equal(metadataGetConfig.propagateClientError, true);
    assert.deepEqual(getMock.mock.calls[2].arguments, [
      { url: config.url, baseURL: config.baseURL, includeResponseHeaders: true, propagateClientError: true },
      user,
    ]);
    assert.equal(state.status, 200);
    assert.deepEqual(state.body, savedErrand);
  });

  it('rejects a classification based on an older errand version before patching', async () => {
    const update: UpdateSupportErrandClassificationDto = {
      expectedVersion: 7,
      classification: { category: 'CATEGORY/HSL', type: 'CATEGORY/HSL/REHAB' },
      categoryLabels: [{ id: 'category-owner-id' }, { id: 'category-label-id' }, { id: 'type-label-id' }],
    };
    const apiService = new ApiService();
    mock.method(apiService, 'get', async <T>(config: { url?: string }) => ({
      data: (config.url?.endsWith('/metadata/labels')
        ? { labelStructure: classificationLabelStructure }
        : { id: 'errand-id', version: 8, labels: [] }) as T,
      message: 'success',
    }));
    const patchMock = mock.method(apiService, 'patch');
    const controller = new SupportErrandController(apiService);
    const { response } = createResponse();

    await assert.rejects(
      controller.updateSupportErrandClassification(createRequest(), 'errand-id', '2281', update, response),
      (error: unknown) =>
        error instanceof Error &&
        'status' in error &&
        error.status === 409 &&
        error.message === 'Support errand classification has changed since it was loaded',
    );

    assert.equal(patchMock.mock.callCount(), 0);
  });

  it('stops before patching when Support Management omits concurrency metadata', async () => {
    const update: UpdateSupportErrandClassificationDto = {
      expectedVersion: 7,
      classification: { category: 'CATEGORY/HSL', type: 'CATEGORY/HSL/REHAB' },
      categoryLabels: [{ id: 'category-owner-id' }, { id: 'category-label-id' }, { id: 'type-label-id' }],
    };
    const apiService = new ApiService();
    mock.method(apiService, 'get', async <T>(config: { url?: string }) => ({
      data: (config.url?.endsWith('/metadata/labels') ? { labelStructure: classificationLabelStructure } : { id: 'errand-id', labels: [] }) as T,
      message: 'success',
    }));
    const patchMock = mock.method(apiService, 'patch');
    const controller = new SupportErrandController(apiService);
    const { response } = createResponse();

    await assert.rejects(
      controller.updateSupportErrandClassification(createRequest(), 'errand-id', '2281', update, response),
      (error: unknown) =>
        error instanceof Error &&
        'status' in error &&
        error.status === 502 &&
        error.message === 'Support Management response is missing a valid errand version',
    );

    assert.equal(patchMock.mock.callCount(), 0);
  });

  it('stops before patching when Support Management classification metadata is unavailable', async () => {
    const update: UpdateSupportErrandClassificationDto = {
      expectedVersion: 7,
      classification: { category: 'CATEGORY/HSL', type: 'CATEGORY/HSL/REHAB' },
      categoryLabels: [{ id: 'category-owner-id' }, { id: 'category-label-id' }, { id: 'type-label-id' }],
    };
    const apiService = new ApiService();
    mock.method(apiService, 'get', async <T>(config: { url?: string }) => ({
      data: (config.url?.endsWith('/metadata/labels') ? null : { id: 'errand-id', version: 7, labels: [] }) as T,
      message: 'success',
    }));
    const patchMock = mock.method(apiService, 'patch');
    const controller = new SupportErrandController(apiService);
    const { response } = createResponse();

    await assert.rejects(
      controller.updateSupportErrandClassification(createRequest(), 'errand-id', '2281', update, response),
      (error: unknown) =>
        error instanceof Error &&
        'status' in error &&
        error.status === 502 &&
        error.message === 'Support Management classification metadata is unavailable',
    );

    assert.equal(patchMock.mock.callCount(), 0);
  });

  for (const invalidETag of ['W/"7"', '']) {
    it(`uses the errand version when Support Management returns the unusable ETag ${JSON.stringify(invalidETag)}`, async () => {
      const update: UpdateSupportErrandClassificationDto = {
        expectedVersion: 7,
        classification: { category: 'CATEGORY/HSL', type: 'CATEGORY/HSL/REHAB' },
        categoryLabels: [{ id: 'category-owner-id' }, { id: 'category-label-id' }, { id: 'type-label-id' }],
      };
      const apiService = new ApiService();
      let errandReadCount = 0;
      mock.method(apiService, 'get', async <T>(config: { url?: string }) =>
        config.url?.endsWith('/metadata/labels')
          ? { data: { labelStructure: classificationLabelStructure } as T, message: 'success' }
          : {
              data: (errandReadCount++ === 0 ? { id: 'errand-id', version: 7, labels: [] } : { id: 'errand-id', version: 8 }) as T,
              message: 'success',
              headers: { etag: invalidETag },
            },
      );
      const patchMock = mock.method(apiService, 'patch', async <T>() => ({ data: {} as T, message: 'success' }));
      const controller = new SupportErrandController(apiService);
      const { response } = createResponse();

      await controller.updateSupportErrandClassification(createRequest(), 'errand-id', '2281', update, response);

      assert.deepEqual(patchMock.mock.calls[0].arguments[0]?.headers, { 'If-Match': '"7"' });
    });
  }

  it('uses a strong errand ETag when the response body omits its version', async () => {
    const update: UpdateSupportErrandClassificationDto = {
      expectedVersion: 7,
      classification: { category: 'CATEGORY/HSL', type: 'CATEGORY/HSL/REHAB' },
      categoryLabels: [{ id: 'category-owner-id' }, { id: 'category-label-id' }, { id: 'type-label-id' }],
    };
    const apiService = new ApiService();
    let errandReadCount = 0;
    mock.method(apiService, 'get', async <T>(config: { url?: string }) => {
      if (config.url?.endsWith('/metadata/labels')) {
        return { data: { labelStructure: classificationLabelStructure } as T, message: 'success' };
      }
      const firstErrandRead = errandReadCount++ === 0;
      return {
        data: (firstErrandRead ? { id: 'errand-id', labels: [] } : { id: 'errand-id', version: 8 }) as T,
        message: 'success',
        headers: { etag: firstErrandRead ? '"7"' : '"8"' },
      };
    });
    const patchMock = mock.method(apiService, 'patch', async <T>() => ({ data: {} as T, message: 'success' }));
    const controller = new SupportErrandController(apiService);
    const { response } = createResponse();

    await controller.updateSupportErrandClassification(createRequest(), 'errand-id', '2281', update, response);

    assert.deepEqual(patchMock.mock.calls[0].arguments[0]?.headers, { 'If-Match': '"7"' });
  });

  it('stops when the strong errand ETag disagrees with the response body version', async () => {
    const update: UpdateSupportErrandClassificationDto = {
      expectedVersion: 7,
      classification: { category: 'CATEGORY/HSL', type: 'CATEGORY/HSL/REHAB' },
      categoryLabels: [{ id: 'category-owner-id' }, { id: 'category-label-id' }, { id: 'type-label-id' }],
    };
    const apiService = new ApiService();
    mock.method(apiService, 'get', async <T>(config: { url?: string }) =>
      config.url?.endsWith('/metadata/labels')
        ? { data: { labelStructure: classificationLabelStructure } as T, message: 'success' }
        : {
            data: { id: 'errand-id', version: 7, labels: [] } as T,
            message: 'success',
            headers: { etag: '"8"' },
          },
    );
    const patchMock = mock.method(apiService, 'patch');
    const controller = new SupportErrandController(apiService);
    const { response } = createResponse();

    await assert.rejects(
      controller.updateSupportErrandClassification(createRequest(), 'errand-id', '2281', update, response),
      (error: unknown) =>
        error instanceof Error &&
        'status' in error &&
        error.status === 502 &&
        error.message === 'Support Management response contains inconsistent errand versions',
    );

    assert.equal(patchMock.mock.callCount(), 0);
  });

  it('propagates a readback client error after the classification patch has succeeded', async () => {
    const update: UpdateSupportErrandClassificationDto = {
      expectedVersion: 7,
      classification: { category: 'CATEGORY/HSL', type: 'CATEGORY/HSL/REHAB' },
      categoryLabels: [{ id: 'category-owner-id' }, { id: 'category-label-id' }, { id: 'type-label-id' }],
    };
    const readbackError = new HttpException(403, 'Readback forbidden');
    const apiService = new ApiService();
    let errandReadCount = 0;
    const getMock = mock.method(apiService, 'get', async <T>(config: { url?: string }) => {
      if (config.url?.endsWith('/metadata/labels')) {
        return { data: { labelStructure: classificationLabelStructure } as T, message: 'success' };
      }
      if (errandReadCount++ === 0) {
        return { data: { id: 'errand-id', version: 7, labels: [] } as T, message: 'success' };
      }
      throw readbackError;
    });
    const patchMock = mock.method(apiService, 'patch', async <T>() => ({ data: {} as T, message: 'success' }));
    const controller = new SupportErrandController(apiService);
    const { response } = createResponse();

    await assert.rejects(
      controller.updateSupportErrandClassification(createRequest(), 'errand-id', '2281', update, response),
      (error: unknown) => error === readbackError,
    );

    assert.equal(patchMock.mock.callCount(), 1);
    assert.equal(getMock.mock.callCount(), 3);
    const readbackGetConfig = getMock.mock.calls[2].arguments[0] as { propagateClientError?: boolean };
    assert.equal(readbackGetConfig.propagateClientError, true);
  });
});
