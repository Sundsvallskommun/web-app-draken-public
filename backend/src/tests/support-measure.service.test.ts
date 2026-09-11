import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { Measure, MetadataResponse } from '@/data-contracts/supportmanagement/data-contracts';
import { CreateSupportMeasureDto, DecideSupportMeasureDto, FollowUpSupportMeasureDto, UpdateSupportMeasureDto } from '@/dtos/support-measure.dto';
import { HttpException } from '@/exceptions/HttpException';
import ApiService from '@/services/api.service';
import { SupportMeasureService } from '@/services/support-measure.service';

import { mockUser } from './helpers/http';
import { mockMunicipalityId, mockSupportErrandId } from './helpers/mock-data';

const user = mockUser({ groups: ['AD-MANAGER'] });
const registrationConfiguration = JSON.stringify([
  { roleName: 'MANAGER', adGroups: ['ad-manager'], measureGroup: 'PREVENTIVE', decides: true },
  { roleName: 'NURSE', adGroups: ['ad-nurse'], measureGroup: 'CLINICAL' },
]);
const proposingConfiguration = JSON.stringify([
  { roleName: 'MANAGER', adGroups: ['ad-manager'], measureGroup: 'PREVENTIVE' },
  { roleName: 'NURSE', adGroups: ['ad-nurse'], measureGroup: 'CLINICAL' },
]);
const educationId = 'dd000000-0000-4000-8000-000000000100';
const oldTypeId = 'dd000000-0000-4000-8000-000000000101';
const metadata: MetadataResponse = {
  measureTypes: [
    { id: educationId, name: 'EDUCATION', displayName: 'Utbildning', measureGroups: ['PREVENTIVE'] },
    { id: oldTypeId, name: 'OLD', measureGroups: ['PREVENTIVE'], deprecated: true },
  ],
  roles: [
    { name: 'NURSE', displayName: 'HSL', sortOrder: 2 },
    { name: 'MANAGER', displayName: 'Enhetschef', sortOrder: 1 },
    { name: 'RETIRED', displayName: 'Tidigare roll', deprecated: true },
  ],
};
const current = { version: 7, status: 'ONGOING' };
const measure: Measure = {
  id: 'measure-1',
  measureTypeId: oldTypeId,
  type: 'OLD',
  version: 3,
  goal: 'Existing goal',
  addedByRole: 'MANAGER',
  addedByUser: mockUser().username,
};
const response = <T>(data: T) => ({ data, message: 'success' });
const newMeasure: CreateSupportMeasureDto = {
  measureTypeId: educationId,
  addedByRole: 'MANAGER',
  description: 'Gemensam utbildning',
  goal: 'Säkrare arbetssätt',
  executed: '2026-09-08T12:00:00+02:00',
};

const plannedProposal: CreateSupportMeasureDto = {
  measureTypeId: educationId,
  addedByRole: 'MANAGER',
  description: 'Gemensam utbildning',
  goal: 'Säkrare arbetssätt',
  plannedStart: '2026-09-08T12:00:00+02:00',
  plannedComplete: '2026-09-10T12:00:00+02:00',
};

const followUp: FollowUpSupportMeasureDto = { desiredEffectAchieved: false, followUpDescription: 'Ingen förbättring ännu.' };
test.each([
  { desiredEffectAchieved: undefined },
  { desiredEffectAchieved: null },
  { desiredEffectAchieved: 'false' },
  { followUpDescription: undefined },
  { followUpDescription: '  ' },
  { followUpDescription: 'x'.repeat(4001) },
  { description: 'Ersätt originalet' },
  { executed: '2026-09-09T00:00:00Z' },
  { accept: 'TRUE' },
])('follow-up contract rejects missing answers and fields from other workflows: %j', async fields => {
  const errors = await validate(plainToInstance(FollowUpSupportMeasureDto, { ...followUp, ...fields }), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  expect(errors.length).toBeGreaterThan(0);
});

test.each([false, true])('follow-up accepts the explicit boolean answer %s', async desiredEffectAchieved => {
  expect(
    await validate(plainToInstance(FollowUpSupportMeasureDto, { ...followUp, desiredEffectAchieved }), {
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  ).toEqual([]);
});

afterEach(() => vi.restoreAllMocks());

function setup(configuration = registrationConfiguration) {
  const api = new ApiService();
  const get = vi.spyOn(api, 'get').mockImplementation(async config => {
    if (config.url?.includes('/json-parameters/')) throw new HttpException(404, 'Not found');
    return response(config.url?.endsWith('/metadata') ? metadata : current);
  });
  const patch = vi.spyOn(api, 'patch').mockResolvedValue(response(undefined));
  const post = vi.spyOn(api, 'post').mockResolvedValue(response(undefined));
  return { service: new SupportMeasureService(api, configuration), get, patch, post };
}

test('reads protected measures with their own versions and keeps parent synchronization separate', async () => {
  const { service, get } = setup();
  get
    .mockResolvedValueOnce(response(current))
    .mockResolvedValueOnce(response([measure]))
    .mockResolvedValueOnce(response(metadata));
  expect(await service.read(mockMunicipalityId, mockSupportErrandId, user)).toEqual({
    measures: [measure],
    errandVersion: 7,
    metadata,
    creationRoles: [metadata.roles![1]],
    registration: {
      status: 'ready',
      roleTypes: [
        { roleName: 'MANAGER', measureTypeIds: [educationId], decides: true },
        { roleName: 'NURSE', measureTypeIds: [], decides: false },
      ],
    },
  });
  expect(get).toHaveBeenCalledTimes(4);
  expect(get.mock.calls[1][0]).toMatchObject({
    url: expect.stringContaining('/errands/' + mockSupportErrandId + '/measures'),
    propagateClientError: true,
  });
});

test('propagates denied access instead of showing a falsely empty list', async () => {
  const { service, get } = setup();
  get.mockResolvedValueOnce(response(current)).mockRejectedValueOnce(new HttpException(403, 'Denied'));
  await expect(service.read(mockMunicipalityId, mockSupportErrandId, user)).rejects.toMatchObject({ status: 403 });
});

test('creates through the protected resource with the authenticated creator', async () => {
  const { service, post } = setup();
  await service.create(mockMunicipalityId, mockSupportErrandId, newMeasure, user);
  expect(post.mock.calls[0]).toEqual([
    expect.objectContaining({
      url: expect.stringContaining('/errands/' + mockSupportErrandId + '/measures'),
      data: { ...newMeasure, accept: 'TRUE', addedByUser: user.username },
      followLocation: false,
      propagateClientError: true,
    }),
    user,
  ]);
  expect(post.mock.calls[0][0].headers).toBeUndefined();
  expect(post.mock.calls[0][0].data).toHaveProperty('addedByUser', user.username);
});

test.each([400, 403])('propagates API role/type validation failures (%s)', async status => {
  const { service, post } = setup();
  post.mockRejectedValueOnce(new HttpException(status, 'Registration rejected'));
  await expect(service.create(mockMunicipalityId, mockSupportErrandId, newMeasure, user)).rejects.toMatchObject({ status });
});

test('does not create in a locked errand', async () => {
  const { service, get, post } = setup();
  get.mockResolvedValueOnce(response({ ...current, status: 'SOLVED' }));
  await expect(service.create(mockMunicipalityId, mockSupportErrandId, newMeasure, user)).rejects.toMatchObject({ status: 409 });
  expect(post).not.toHaveBeenCalled();
});

test.each(['', '{invalid'])('reads history when registration configuration is absent or invalid: %s', async configuration => {
  const { service, get } = setup(configuration);
  get
    .mockResolvedValueOnce(response(current))
    .mockResolvedValueOnce(response([measure]))
    .mockResolvedValueOnce(response(metadata));
  const snapshot = await service.read(mockMunicipalityId, mockSupportErrandId, user);
  expect(snapshot.measures).toEqual([measure]);
  expect(snapshot.creationRoles).toEqual([]);
  expect(snapshot.registration.status).toBe(configuration ? 'invalid' : 'unconfigured');
});

test('edits historic proposals with the original measure ETag while preserving attribution', async () => {
  const { service, get, patch } = setup();
  get.mockResolvedValueOnce(response(current)).mockResolvedValueOnce(response(measure));
  await service.update(mockMunicipalityId, mockSupportErrandId, 'measure-1', '"3"', { goal: 'Revised' }, user);
  expect(patch.mock.calls[0]).toEqual([
    expect.objectContaining({
      url: expect.stringContaining('/measures/measure-1'),
      data: { goal: 'Revised' },
      headers: { 'If-Match': '"3"' },
      followLocation: false,
      propagateClientError: true,
    }),
    user,
  ]);
});

test('changes type by metadata UUID, never by its name or display name', async () => {
  const { service, get, patch } = setup();
  get.mockResolvedValueOnce(response(current)).mockResolvedValueOnce(response(measure));
  await service.update(mockMunicipalityId, mockSupportErrandId, 'measure-1', '"3"', { measureTypeId: educationId }, user);
  expect(patch.mock.calls[0][0].data).toEqual({ measureTypeId: educationId });
});

test('allows an unchanged historic type UUID', async () => {
  const { service, get, patch } = setup();
  get.mockResolvedValueOnce(response(current)).mockResolvedValueOnce(response(measure));
  await service.update(mockMunicipalityId, mockSupportErrandId, 'measure-1', '"3"', { measureTypeId: oldTypeId, goal: 'Revised' }, user);
  expect(patch.mock.calls[0][0].data).toEqual({ measureTypeId: oldTypeId, goal: 'Revised' });
});

test.each(['SOLVED', 'SUSPENDED', 'ASSIGNED', 'REOPENED'])('rejects writes in locked status %s', async status => {
  const { service, get, patch } = setup();
  get.mockResolvedValueOnce(response({ ...current, status }));
  await expect(service.update(mockMunicipalityId, mockSupportErrandId, 'measure-1', '"3"', { goal: 'Revised' }, user)).rejects.toMatchObject({
    status: 409,
  });
  expect(patch).not.toHaveBeenCalled();
});

test('rejects a stale measure version before writing', async () => {
  const { service, get, patch } = setup();
  get.mockResolvedValueOnce(response(current)).mockResolvedValueOnce(response(measure));
  await expect(service.update(mockMunicipalityId, mockSupportErrandId, 'measure-1', '"2"', { goal: 'Revised' }, user)).rejects.toMatchObject({
    status: 412,
  });
  expect(patch).not.toHaveBeenCalled();
});

test('allows intervening parent edits without substituting the measure version', async () => {
  const { service, get, patch } = setup();
  get
    .mockResolvedValueOnce(response(current))
    .mockResolvedValueOnce(response(measure))
    .mockResolvedValueOnce(response({ ...current, version: 19 }));
  await service.update(mockMunicipalityId, mockSupportErrandId, 'measure-1', '"3"', { goal: 'Revised' }, user);
  expect(patch.mock.calls[0][0].headers).toEqual({ 'If-Match': '"3"' });
});

test('propagates a conflict that occurs between reading and writing the measure', async () => {
  const { service, get, patch } = setup();
  get.mockResolvedValueOnce(response(current)).mockResolvedValueOnce(response(measure));
  patch.mockRejectedValueOnce(new HttpException(412, 'Measure changed'));
  await expect(service.update(mockMunicipalityId, mockSupportErrandId, 'measure-1', '"3"', { goal: 'Revised' }, user)).rejects.toMatchObject({
    status: 412,
  });
});

test('rejects an errand locked during dependent reads', async () => {
  const { service, get, patch } = setup();
  get
    .mockResolvedValueOnce(response(current))
    .mockResolvedValueOnce(response(measure))
    .mockResolvedValueOnce(response({ ...current, status: 'SOLVED' }));
  await expect(service.update(mockMunicipalityId, mockSupportErrandId, 'measure-1', '"3"', { goal: 'Revised' }, user)).rejects.toMatchObject({
    status: 409,
  });
  expect(patch).not.toHaveBeenCalled();
});

test.each([undefined, '3', 'W/"3"', '*', '"3", "4"', `"${Number.MAX_SAFE_INTEGER + 1}"`])('rejects absent or invalid If-Match %s', async ifMatch => {
  const { service, get, patch } = setup();
  await expect(service.update(mockMunicipalityId, mockSupportErrandId, 'measure-1', ifMatch, { goal: 'Revised' }, user)).rejects.toMatchObject({
    status: ifMatch === undefined ? 428 : 400,
  });
  expect(get).not.toHaveBeenCalled();
  expect(patch).not.toHaveBeenCalled();
});

test('rejects upstream responses without a measure version', async () => {
  const { service, get, patch } = setup();
  get.mockResolvedValueOnce(response(current)).mockResolvedValueOnce(response({ ...measure, version: undefined }));
  await expect(service.update(mockMunicipalityId, mockSupportErrandId, 'measure-1', '"3"', { goal: 'Revised' }, user)).rejects.toMatchObject({
    status: 502,
  });
  expect(patch).not.toHaveBeenCalled();
});

test.each([
  { type: 'EDUCATION' },
  { measureTypeId: 'EDUCATION' },
  { measureTypeId: null },
  { version: 3 },
  { accept: 'TRUE' },
  { addedByUser: 'someone-else' },
  { addedByRole: 'MANAGER' },
  { reworkGoal: 'Bypass' },
  { id: 'other-id' },
  { plannedStart: null },
  { plannedStart: 'invalid' },
])('rejects read-only or invalid edits: %j', async body => {
  const errors = await validate(plainToInstance(UpdateSupportMeasureDto, body), { whitelist: true, forbidNonWhitelisted: true });
  expect(errors.length).toBeGreaterThan(0);
});

test('accepts a UUID reference and basic fields in a narrow patch', async () => {
  const errors = await validate(plainToInstance(UpdateSupportMeasureDto, { measureTypeId: educationId, goal: 'Revised' }), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  expect(errors).toEqual([]);
});

test.each([
  { measureTypeId: undefined },
  { measureTypeId: 'EDUCATION' },
  { addedByRole: undefined },
  { addedByRole: null },
  { addedByRole: ' ' },
  { description: undefined },
  { goal: ' ' },
  { addedByUser: 'someone-else' },
  { version: 3 },
  { accept: 'TRUE' },
  { plannedStart: null },
])('rejects missing, invalid or browser-supplied audit fields on creation: %j', async fields => {
  const errors = await validate(plainToInstance(CreateSupportMeasureDto, { ...newMeasure, ...fields }), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  expect(errors.length).toBeGreaterThan(0);
});

test('accepts the creation contract with a role name and without browser-supplied creator', async () => {
  expect(await validate(plainToInstance(CreateSupportMeasureDto, newMeasure), { whitelist: true, forbidNonWhitelisted: true })).toEqual([]);
});

test('rejects a role the current session groups do not grant', async () => {
  const { service, post } = setup();
  await expect(service.create(mockMunicipalityId, mockSupportErrandId, { ...newMeasure, addedByRole: 'NURSE' }, user)).rejects.toMatchObject({
    status: 403,
  });
  expect(post).not.toHaveBeenCalled();
});

test('rejects an active type outside the selected role configuration', async () => {
  const { service, post } = setup();
  const nurse = mockUser({ groups: ['ad-nurse'] });
  await expect(service.create(mockMunicipalityId, mockSupportErrandId, { ...newMeasure, addedByRole: 'NURSE' }, nurse)).rejects.toMatchObject({
    status: 400,
  });
  expect(post).not.toHaveBeenCalled();
});

test('does not infer namespace roles by comparing group text to role names', async () => {
  const { service, get } = setup();
  get
    .mockResolvedValueOnce(response(current))
    .mockResolvedValueOnce(response([measure]))
    .mockResolvedValueOnce(response(metadata));
  const snapshot = await service.read(mockMunicipalityId, mockSupportErrandId, mockUser({ groups: ['MANAGER'] }));
  expect(snapshot.creationRoles).toEqual([]);
});

test('preserves a historical measure when registration is not configured', async () => {
  const { service, get, patch } = setup('');
  get.mockResolvedValueOnce(response(current)).mockResolvedValueOnce(response(measure));
  await service.update(mockMunicipalityId, mockSupportErrandId, 'measure-1', '"3"', { goal: 'Revised' }, user);
  expect(patch).toHaveBeenCalledOnce();
});

test('checks type changes against the saved role, independently of the editor role', async () => {
  const { service, get, patch } = setup();
  get.mockResolvedValueOnce(response(current)).mockResolvedValueOnce(response(measure));
  await service.update(
    mockMunicipalityId,
    mockSupportErrandId,
    'measure-1',
    '"3"',
    { measureTypeId: educationId },
    mockUser({ groups: ['ad-nurse'] }),
  );
  expect(patch.mock.calls[0][0].data).toEqual({ measureTypeId: educationId });
});

test('rejects an effective date range that reverses the stored start and new completion', async () => {
  const { service, get, patch } = setup();
  get.mockResolvedValueOnce(response(current)).mockResolvedValueOnce(response({ ...measure, plannedStart: '2026-09-10T00:00:00Z' }));
  await expect(
    service.update(mockMunicipalityId, mockSupportErrandId, 'measure-1', '"3"', { plannedComplete: '2026-09-09T00:00:00Z' }, user),
  ).rejects.toMatchObject({ status: 400 });
  expect(patch).not.toHaveBeenCalled();
});

test("accepts a deciding role's own measure on creation and leaves other roles' measures as proposals", async () => {
  const deciding = setup();
  await deciding.service.create(mockMunicipalityId, mockSupportErrandId, newMeasure, user);
  expect(deciding.post.mock.calls[0][0].data).toMatchObject({ addedByRole: 'MANAGER', accept: 'TRUE' });

  const proposing = setup(proposingConfiguration);
  await proposing.service.create(mockMunicipalityId, mockSupportErrandId, plannedProposal, user);
  expect(proposing.post.mock.calls[0][0].data).not.toHaveProperty('accept');
});

test('rejects executed measures from a proposing role on creation', async () => {
  const { service, post } = setup(proposingConfiguration);
  await expect(service.create(mockMunicipalityId, mockSupportErrandId, newMeasure, user)).rejects.toMatchObject({ status: 400 });
  expect(post).not.toHaveBeenCalled();
});

test('lets a proposal be reported as executed only once it is accepted', async () => {
  const pending = setup(proposingConfiguration);
  pending.get.mockResolvedValueOnce(response(current)).mockResolvedValueOnce(response(measure));
  await expect(
    pending.service.update(mockMunicipalityId, mockSupportErrandId, 'measure-1', '"3"', { executed: '2026-09-09T12:00:00+02:00' }, user),
  ).rejects.toMatchObject({ status: 400 });
  expect(pending.patch).not.toHaveBeenCalled();

  const accepted = setup(proposingConfiguration);
  accepted.get.mockResolvedValueOnce(response(current)).mockResolvedValueOnce(response({ ...measure, accept: 'TRUE' }));
  await accepted.service.update(mockMunicipalityId, mockSupportErrandId, 'measure-1', '"3"', { executed: '2026-09-09T12:00:00+02:00' }, user);
  expect(accepted.patch).toHaveBeenCalledTimes(1);
});

test('rejects an executed date in the future on creation and on update', async () => {
  const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const create = setup();
  await expect(create.service.create(mockMunicipalityId, mockSupportErrandId, { ...newMeasure, executed: future }, user)).rejects.toMatchObject({
    status: 400,
  });
  expect(create.post).not.toHaveBeenCalled();

  const update = setup();
  update.get.mockResolvedValueOnce(response(current)).mockResolvedValueOnce(response({ ...measure, accept: 'TRUE' }));
  await expect(update.service.update(mockMunicipalityId, mockSupportErrandId, 'measure-1', '"3"', { executed: future }, user)).rejects.toMatchObject({
    status: 400,
  });
  expect(update.patch).not.toHaveBeenCalled();
});

test('lets only the user who registered a measure edit it, regardless of case', async () => {
  const other = setup();
  other.get.mockResolvedValueOnce(response(current)).mockResolvedValueOnce(response({ ...measure, addedByUser: 'someone.else' }));
  await expect(other.service.update(mockMunicipalityId, mockSupportErrandId, 'measure-1', '"3"', { goal: 'x' }, user)).rejects.toMatchObject({
    status: 403,
  });
  expect(other.patch).not.toHaveBeenCalled();

  const own = setup();
  own.get.mockResolvedValueOnce(response(current)).mockResolvedValueOnce(response({ ...measure, addedByUser: String(user.username).toUpperCase() }));
  await own.service.update(mockMunicipalityId, mockSupportErrandId, 'measure-1', '"3"', { goal: 'x' }, user);
  expect(own.patch).toHaveBeenCalledTimes(1);

  const unattributed = setup();
  unattributed.get.mockResolvedValueOnce(response(current)).mockResolvedValueOnce(response({ ...measure, addedByUser: undefined }));
  await expect(unattributed.service.update(mockMunicipalityId, mockSupportErrandId, 'measure-1', '"3"', { goal: 'x' }, user)).rejects.toMatchObject({
    status: 403,
  });
});

test.each(['TRUE', 'FALSE', 'REWORK'] as const)('a deciding user can assess another role’s proposal with decision %s', async accept => {
  const { service, get, patch } = setup();
  // Deliberately outside the manager's own selectable types. The decision must not rewrite the proposal.
  const proposal = { ...measure, addedByUser: 'someone.else', addedByRole: 'NURSE', measureTypeId: 'clinical-type' };
  get.mockResolvedValueOnce(response(current)).mockResolvedValueOnce(response(proposal));
  await service.decide(
    mockMunicipalityId,
    mockSupportErrandId,
    'measure-1',
    '"3"',
    {
      accept,
      acceptMotivation: '  Endast dokumentationsdelen ska genomföras.  ',
    },
    user,
  );
  expect(patch.mock.calls[0]).toEqual([
    {
      url: expect.stringContaining('/measures/measure-1'),
      data: { accept, acceptMotivation: 'Endast dokumentationsdelen ska genomföras.' },
      headers: { 'If-Match': '"3"' },
      followLocation: false,
      propagateClientError: true,
    },
    user,
  ]);
  expect(patch).toHaveBeenCalledTimes(1);
});

test('full acceptance permits an omitted comment', async () => {
  const { service, get, patch } = setup();
  get.mockResolvedValueOnce(response(current)).mockResolvedValueOnce(response(measure));
  await service.decide(mockMunicipalityId, mockSupportErrandId, 'measure-1', '"3"', { accept: 'TRUE' }, user);
  expect(patch.mock.calls[0][0].data).toEqual({ accept: 'TRUE', acceptMotivation: '' });
});

test.each([{ groups: ['ad-nurse'] }, { groups: ['MANAGER'] }, { groups: [] }])(
  'does not grant decision rights from another role or a role name: %j',
  async ({ groups }) => {
    const { service, get, patch } = setup();
    get.mockResolvedValueOnce(response(current)).mockResolvedValueOnce(response(measure));
    await expect(
      service.decide(mockMunicipalityId, mockSupportErrandId, 'measure-1', '"3"', { accept: 'TRUE' }, mockUser({ groups })),
    ).rejects.toMatchObject({ status: 403 });
    expect(patch).not.toHaveBeenCalled();
  },
);

test.each(['', '{invalid'])('blocks decisions when role configuration is unavailable: %s', async configuration => {
  const { service, get, patch } = setup(configuration);
  get.mockResolvedValueOnce(response(current)).mockResolvedValueOnce(response(measure));
  await expect(service.decide(mockMunicipalityId, mockSupportErrandId, 'measure-1', '"3"', { accept: 'TRUE' }, user)).rejects.toMatchObject({
    status: 503,
  });
  expect(patch).not.toHaveBeenCalled();
});

test.each(['FALSE', 'REWORK'] as const)('requires a nonblank comment for %s', async accept => {
  const { service, get, patch } = setup();
  get.mockResolvedValueOnce(response(current)).mockResolvedValueOnce(response(measure));
  await expect(
    service.decide(mockMunicipalityId, mockSupportErrandId, 'measure-1', '"3"', { accept, acceptMotivation: '  ' }, user),
  ).rejects.toMatchObject({ status: 400 });
  expect(patch).not.toHaveBeenCalled();
});

test.each([{ accept: 'TRUE' }, { accept: 'FALSE' }, { accept: 'REWORK' }, { executed: '2026-09-09T00:00:00Z' }])(
  'does not replace a decision or assess an executed measure: %j',
  async fields => {
    const { service, get, patch } = setup();
    get.mockResolvedValueOnce(response(current)).mockResolvedValueOnce(response({ ...measure, ...fields }));
    await expect(service.decide(mockMunicipalityId, mockSupportErrandId, 'measure-1', '"3"', { accept: 'TRUE' }, user)).rejects.toMatchObject({
      status: 409,
    });
    expect(patch).not.toHaveBeenCalled();
  },
);

test('rejects a decision on a stale version before fetching decision permissions', async () => {
  const { service, get, patch } = setup();
  get.mockResolvedValueOnce(response(current)).mockResolvedValueOnce(response(measure));
  await expect(service.decide(mockMunicipalityId, mockSupportErrandId, 'measure-1', '"2"', { accept: 'TRUE' }, user)).rejects.toMatchObject({
    status: 412,
  });
  expect(patch).not.toHaveBeenCalled();
});

test('does not decide when the parent is locked during permission checks', async () => {
  const { service, get, patch } = setup();
  get
    .mockResolvedValueOnce(response(current))
    .mockResolvedValueOnce(response(measure))
    .mockResolvedValueOnce(response(metadata))
    .mockResolvedValueOnce(response({ ...current, status: 'SOLVED' }));
  await expect(service.decide(mockMunicipalityId, mockSupportErrandId, 'measure-1', '"3"', { accept: 'TRUE' }, user)).rejects.toMatchObject({
    status: 409,
  });
  expect(patch).not.toHaveBeenCalled();
});

test('propagates a decision conflict without retrying the write', async () => {
  const { service, get, patch } = setup();
  get.mockResolvedValueOnce(response(current)).mockResolvedValueOnce(response(measure));
  patch.mockRejectedValueOnce(new HttpException(412, 'Measure changed'));
  await expect(service.decide(mockMunicipalityId, mockSupportErrandId, 'measure-1', '"3"', { accept: 'TRUE' }, user)).rejects.toMatchObject({
    status: 412,
  });
  expect(patch).toHaveBeenCalledTimes(1);
});

test.each(['TRUE', 'FALSE', 'REWORK'])('protects the original content after decision %s while allowing planning updates', async accept => {
  const { service, get, patch } = setup();
  for (const changes of [{ goal: 'Changed goal' }, { description: 'Changed description' }, { measureTypeId: educationId }]) {
    get.mockResolvedValueOnce(response(current)).mockResolvedValueOnce(response({ ...measure, accept }));
    await expect(service.update(mockMunicipalityId, mockSupportErrandId, 'measure-1', '"3"', changes, user)).rejects.toMatchObject({ status: 409 });
  }
  expect(patch).not.toHaveBeenCalled();
  get.mockResolvedValueOnce(response(current)).mockResolvedValueOnce(response({ ...measure, accept }));
  const changes = { responsibleUser: 'Anna', plannedStart: '2026-09-10T00:00:00Z' };
  await service.update(mockMunicipalityId, mockSupportErrandId, 'measure-1', '"3"', changes, user);
  expect(patch.mock.calls[0][0].data).toEqual(changes);
});

test.each(['TRUE', 'REWORK'])('allows execution after %s even if registration is no longer configured', async accept => {
  const { service, get, patch } = setup('');
  get.mockResolvedValueOnce(response(current)).mockResolvedValueOnce(response({ ...measure, accept }));
  await service.update(mockMunicipalityId, mockSupportErrandId, 'measure-1', '"3"', { executed: '2026-09-09T00:00:00Z' }, user);
  expect(patch).toHaveBeenCalledTimes(1);
});

test.each([undefined, 'FALSE', 'UNKNOWN'])('even a deciding role cannot execute a measure without approval: %s', async accept => {
  const { service, get, patch } = setup();
  get.mockResolvedValueOnce(response(current)).mockResolvedValueOnce(response({ ...measure, accept }));
  await expect(
    service.update(mockMunicipalityId, mockSupportErrandId, 'measure-1', '"3"', { executed: '2026-09-09T00:00:00Z' }, user),
  ).rejects.toMatchObject({ status: 400 });
  expect(patch).not.toHaveBeenCalled();
});

test.each([
  { accept: 'TRUE' },
  { accept: 'FALSE', acceptMotivation: 'Avslås därför att…' },
  { accept: 'REWORK', acceptMotivation: 'Genomför endast del A eftersom…' },
])('accepts the narrow decision contract: %j', async body => {
  expect(await validate(plainToInstance(DecideSupportMeasureDto, body), { whitelist: true, forbidNonWhitelisted: true })).toEqual([]);
});

test.each([
  { accept: null },
  { accept: 'UNKNOWN' },
  { accept: undefined },
  { accept: 'FALSE' },
  { accept: 'REWORK', acceptMotivation: '  ' },
  { accept: 'FALSE', acceptMotivation: null },
  { addedByRole: 'MANAGER' },
  { addedByUser: 'forged' },
  { goal: 'Replacement' },
  { reworkGoal: 'Replacement' },
  { reworkDescription: 'Replacement' },
  { executed: '2026-09-09T00:00:00Z' },
])('rejects invalid decisions and fields belonging to other workflows: %j', async fields => {
  const errors = await validate(plainToInstance(DecideSupportMeasureDto, { accept: 'TRUE', ...fields }), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  expect(errors.length).toBeGreaterThan(0);
});
