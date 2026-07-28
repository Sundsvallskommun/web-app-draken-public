import {
  ContactInformationContactTypeEnum,
  ErrandChannelEnum as CasedataErrandDtoChannelEnum,
  StakeholderTypeEnum as CasedataStakeholderDtoTypeEnum,
} from '@/data-contracts/case-data/data-contracts';
import { ErrandAttachment, Label, Parameter, Stakeholder as SupportStakeholder } from '@/data-contracts/supportmanagement/data-contracts';
import { ExternalIdType } from '@/interfaces/externalIdType.interface';
import { Role } from '@/interfaces/role';
import {
  buildErrandFilter,
  getNewErrandDefaults,
  mapContactChannels,
  NEW_ERRAND_DEFAULTS,
  resolveDefaultLabels,
  sanitizeQuery,
  stripPhoneNoise,
  toAttachmentDto,
  toCasedataChannel,
  toCasedataStakeholder,
  toFacilities,
} from '@/services/support-errand.service';

import {
  mockAdUsername,
  mockCareOf,
  mockCasedataErrandNumber,
  mockCity,
  mockEmail,
  mockFileContent,
  mockFileName,
  mockFirstName,
  mockLastName,
  mockMimeType,
  mockMultiDotFileName,
  mockOrganizationName,
  mockOrganizationNumber,
  mockOrganizationPartyId,
  mockPhoneNumber,
  mockPhoneNumberCountryCode,
  mockPropertyDesignation,
  mockSecondaryPropertyDesignation,
  mockStreet,
  mockZipCode,
} from './helpers/mock-data';

// Minimal stakeholder input; individual tests set only the fields they exercise.
const stakeholder = (overrides: Partial<SupportStakeholder> = {}): SupportStakeholder => ({ ...overrides }) as SupportStakeholder;

// Labels carry required `classification`/`resourceName` fields that none of these tests care about.
const label = (resourcePath: string, labels: Label[] = []): Label =>
  ({ resourcePath, resourceName: resourcePath, classification: 'CLASSIFICATION', labels }) as Label;

describe('support-errand.service', () => {
  describe('sanitizeQuery', () => {
    it('returns an empty string for undefined', () => {
      expect(sanitizeQuery(undefined)).toBe('');
    });

    it("strips characters that would break out of the filter's quoted literal", () => {
      // The result is interpolated into `description~'*<query>*'`, so quotes, stars,
      // tildes, parens and percent signs must not survive.
      expect(sanitizeQuery("' or 1:'1")).toBe('or 1:1');
      expect(sanitizeQuery('a*b(c)d%e~f')).toBe('abcdef');
    });

    it('keeps Swedish letters, digits and the allowed punctuation', () => {
      expect(sanitizeQuery('Åsa Öberg-Ekström, 851 85: nr_1.2')).toBe('Åsa Öberg-Ekström, 851 85: nr_1.2');
    });

    it('normalizes full-width input to NFKC', () => {
      expect(sanitizeQuery('Ａｎｎａ')).toBe('Anna');
    });

    it('collapses runs of whitespace and trims', () => {
      expect(sanitizeQuery('  Anna   Andersson \n ')).toBe('Anna Andersson');
    });

    it('is stable across repeated calls despite the shared /g regex', () => {
      // SAFE_CHARS_REGEX is module-level and g-flagged; String.replace resets lastIndex,
      // but pin the behaviour so a future switch to .test()/.exec() cannot regress it.
      expect(sanitizeQuery('a*b')).toBe('ab');
      expect(sanitizeQuery('a*b')).toBe('ab');
    });
  });

  describe('stripPhoneNoise', () => {
    it('removes every plus sign and leaves the rest untouched', () => {
      expect(stripPhoneNoise(mockPhoneNumberCountryCode)).toBe(mockPhoneNumberCountryCode.replace('+', ''));
    });

    it('is a no-op for a string without plus signs', () => {
      expect(stripPhoneNoise(mockPhoneNumber)).toBe(mockPhoneNumber);
    });
  });

  describe('buildErrandFilter', () => {
    it('returns an empty string when nothing is filtered on', () => {
      expect(buildErrandFilter({})).toBe('');
    });

    it('expands a free-text query into the full disjunction', () => {
      const q = mockFirstName;
      expect(buildErrandFilter({ query: q })).toBe(
        `&filter=(description~'*${q}*'` +
          ` or title~'*${q}*'` +
          ` or errandNumber~'*${q}*'` +
          ` or exists(stakeholders.firstName~'*${q}*')` +
          ` or exists(stakeholders.lastName~'*${q}*')` +
          ` or exists(stakeholders.address~'*${q}*')` +
          ` or exists(stakeholders.zipCode~'*${q}*')` +
          ` or exists(stakeholders.contactChannels.value~'*${q}*' and stakeholders.contactChannels.type~'EMAIL')` +
          ` or exists(stakeholders.contactChannels.value~'*${q}*' and stakeholders.contactChannels.type~'PHONE')` +
          ` or exists(stakeholders.organizationName~'*${q}*')` +
          ` or exists(stakeholders.externalId~'*${q}*')` +
          ` or exists(parameters.values~'*${q}*'))`,
      );
    });

    it('sanitizes the query before interpolating it', () => {
      // The quotes, tilde and star in the query are all stripped, so the injected
      // fragment cannot terminate the literal it is placed inside.
      const filter = buildErrandFilter({ query: "A' or title~'*" });
      expect(filter).toContain("description~'*A or title*'");
      expect(filter).not.toContain("~'*'");
    });

    it('uses the plus-stripped query for the phone clause', () => {
      // sanitizeQuery already drops '+' (it is outside the safe-character set), so the
      // phone and email clauses currently always carry the same value.
      const stripped = mockPhoneNumberCountryCode.replace('+', '');
      const filter = buildErrandFilter({ query: mockPhoneNumberCountryCode });
      expect(filter).toContain(`stakeholders.contactChannels.value~'*${stripped}*' and stakeholders.contactChannels.type~'PHONE'`);
      expect(filter).toContain(`stakeholders.contactChannels.value~'*${stripped}*' and stakeholders.contactChannels.type~'EMAIL'`);
    });

    it('appends an externalId clause when a party id was resolved', () => {
      expect(buildErrandFilter({ query: mockFirstName, partyId: mockOrganizationPartyId })).toContain(
        ` or exists(stakeholders.externalId~'*${mockOrganizationPartyId}*'))`,
      );
    });

    it('ignores the party id when there is no query', () => {
      expect(buildErrandFilter({ partyId: mockOrganizationPartyId })).toBe('');
    });

    it('matches an assigned stakeholder, falling back to the reporter when unassigned', () => {
      expect(buildErrandFilter({ stakeholders: mockAdUsername })).toBe(
        `&filter=(assignedUserId:'${mockAdUsername}' or (assignedUserId is null and reporterUserId:'${mockAdUsername}' ))`,
      );
    });

    it('wraps a single-valued priority/category/type/status in an or group', () => {
      expect(buildErrandFilter({ priority: 'HIGH' })).toBe("&filter=(priority:'HIGH')");
      expect(buildErrandFilter({ category: 'SALARY' })).toBe("&filter=(category:'SALARY')");
      expect(buildErrandFilter({ type: 'SALARY.UNCATEGORIZED' })).toBe("&filter=(type:'SALARY.UNCATEGORIZED')");
      expect(buildErrandFilter({ status: 'NEW' })).toBe("&filter=(status:'NEW')");
    });

    it('splits comma-separated values into an or group', () => {
      expect(buildErrandFilter({ status: 'NEW,ONGOING,SOLVED' })).toBe("&filter=(status:'NEW' or status:'ONGOING' or status:'SOLVED')");
    });

    it('emits channel and resolution as bare clauses', () => {
      expect(buildErrandFilter({ channel: 'EMAIL' })).toBe("&filter=channel:'EMAIL'");
      expect(buildErrandFilter({ resolution: 'INFORMED' })).toBe("&filter=resolution:'INFORMED'");
    });

    it('reduces a full label path to its leaf', () => {
      expect(
        buildErrandFilter({
          labelCategory: 'SALARY',
          labelType: 'SALARY/UNCATEGORIZED',
          labelSubType: 'SALARY/UNCATEGORIZED/VACATION',
        }),
      ).toBe("&filter=(exists(labels.metadataLabel.resourcePath:'SALARY/UNCATEGORIZED/VACATION'))");
    });

    it('drops a label whose parent is not part of the selection', () => {
      // 'IAF/WORK' has no ancestor in the selected categories, so only SALARY survives.
      expect(buildErrandFilter({ labelCategory: 'SALARY', labelType: 'IAF/WORK' })).toBe(
        "&filter=(exists(labels.metadataLabel.resourcePath:'SALARY'))",
      );
    });

    it('adds no clause when the label selection reduces to nothing', () => {
      expect(buildErrandFilter({ labelCategory: '', labelType: '', labelSubType: '' })).toBe('');
    });

    it('converts start to the beginning and end to the end of the local day', () => {
      // TZ is pinned to Europe/Stockholm in vitest.config.ts, so the offset is stable.
      expect(buildErrandFilter({ start: '2026-01-15' })).toBe("&filter=created>'2026-01-15T00%3A00%3A00.000%2B01%3A00'");
      expect(buildErrandFilter({ end: '2026-01-15' })).toBe("&filter=created<'2026-01-15T23%3A59%3A59.999%2B01%3A00'");
    });

    it('joins multiple filters with and, in the builder’s own order', () => {
      // Order follows the order of the checks in buildErrandFilter, not the input object.
      expect(buildErrandFilter({ status: 'NEW', channel: 'EMAIL', priority: 'HIGH' })).toBe(
        "&filter=(priority:'HIGH') and channel:'EMAIL' and (status:'NEW')",
      );
    });
  });

  describe('getNewErrandDefaults', () => {
    it('returns the classification configured for each drake', () => {
      expect(getNewErrandDefaults('KC')?.classification).toEqual({ category: 'CONTACT_SUNDSVALL', type: 'UNCATEGORIZED' });
      expect(getNewErrandDefaults('LOP')?.classification).toEqual({ category: 'SALARY', type: 'SALARY.UNCATEGORIZED' });
      expect(getNewErrandDefaults('MSVA')?.classification).toEqual({ category: 'MSVA', type: 'MSVA.UNCATEGORIZED' });
    });

    it('covers every configured drake', () => {
      expect(Object.keys(NEW_ERRAND_DEFAULTS).sort()).toEqual(['BOU', 'IK', 'KA', 'KC', 'LOK', 'LOP', 'MSVA', 'ROB', 'SE']);
    });

    it('leaves labels undefined for the drakes that configure none', () => {
      expect(getNewErrandDefaults('KC')?.labels).toBeUndefined();
      expect(getNewErrandDefaults('MSVA')?.labels).toBeUndefined();
      expect(getNewErrandDefaults('ROB')?.labels).toBeUndefined();
    });

    it('returns undefined for an unknown or missing application', () => {
      expect(getNewErrandDefaults('NOT_A_DRAKE')).toBeUndefined();
      expect(getNewErrandDefaults(undefined)).toBeUndefined();
    });
  });

  describe('resolveDefaultLabels', () => {
    const structure = [label('SALARY', [label('SALARY/UNCATEGORIZED', [label('SALARY/UNCATEGORIZED/UNCATEGORIZED')])])];

    it('returns the whole path when every level resolves', () => {
      const result = resolveDefaultLabels(structure, {
        category: 'SALARY',
        type: 'SALARY/UNCATEGORIZED',
        subType: 'SALARY/UNCATEGORIZED/UNCATEGORIZED',
      });
      expect(result.map(l => l.resourcePath)).toEqual(['SALARY', 'SALARY/UNCATEGORIZED', 'SALARY/UNCATEGORIZED/UNCATEGORIZED']);
    });

    it('stops at the type when no subType is requested', () => {
      const result = resolveDefaultLabels(structure, { category: 'SALARY', type: 'SALARY/UNCATEGORIZED' });
      expect(result.map(l => l.resourcePath)).toEqual(['SALARY', 'SALARY/UNCATEGORIZED']);
    });

    it('falls back to the longest prefix that could be resolved', () => {
      expect(
        resolveDefaultLabels(structure, { category: 'SALARY', type: 'SALARY/UNCATEGORIZED', subType: 'SALARY/UNCATEGORIZED/MISSING' }).map(
          l => l.resourcePath,
        ),
      ).toEqual(['SALARY', 'SALARY/UNCATEGORIZED']);
      expect(resolveDefaultLabels(structure, { category: 'SALARY', type: 'SALARY/MISSING' }).map(l => l.resourcePath)).toEqual(['SALARY']);
    });

    it('returns an empty list when the category is missing or the structure is absent', () => {
      expect(resolveDefaultLabels(structure, { category: 'MISSING', type: 'MISSING/X' })).toEqual([]);
      expect(resolveDefaultLabels(undefined, { category: 'SALARY', type: 'SALARY/UNCATEGORIZED' })).toEqual([]);
    });
  });

  describe('mapContactChannels', () => {
    it('maps phone and email onto the CaseData contact types', () => {
      expect(
        mapContactChannels([
          { type: 'PHONE', value: mockPhoneNumber },
          { type: 'EMAIL', value: mockEmail },
        ]),
      ).toEqual([
        { contactType: ContactInformationContactTypeEnum.PHONE, value: mockPhoneNumber },
        { contactType: ContactInformationContactTypeEnum.EMAIL, value: mockEmail },
      ]);
    });

    it('drops channels of an unknown type', () => {
      expect(mapContactChannels([{ type: 'FAX', value: mockPhoneNumber }])).toEqual([]);
    });

    it('returns an empty list for an empty or missing channel list', () => {
      expect(mapContactChannels([])).toEqual([]);
      expect(mapContactChannels(undefined)).toEqual([]);
    });
  });

  describe('toCasedataStakeholder', () => {
    it('maps a COMPANY stakeholder to an organization', () => {
      const result = toCasedataStakeholder(
        stakeholder({
          externalIdType: ExternalIdType.COMPANY,
          externalId: mockOrganizationPartyId,
          role: 'PRIMARY',
          organizationName: mockOrganizationName,
        }),
        mockOrganizationNumber,
      );
      expect(result).toEqual({
        type: CasedataStakeholderDtoTypeEnum.ORGANIZATION,
        roles: [Role.APPLICANT],
        addresses: [],
        contactInformation: [],
        firstName: '',
        lastName: '',
        organizationName: mockOrganizationName,
        personId: mockOrganizationPartyId,
        organizationNumber: mockOrganizationNumber,
      });
    });

    it('maps every other externalIdType to a person', () => {
      const result = toCasedataStakeholder(
        stakeholder({ externalIdType: ExternalIdType.PRIVATE, role: 'CONTACT', firstName: mockFirstName, lastName: mockLastName }),
      );
      expect(result).toEqual({
        type: CasedataStakeholderDtoTypeEnum.PERSON,
        roles: [Role.CONTACT_PERSON],
        addresses: [],
        contactInformation: [],
        firstName: mockFirstName,
        lastName: mockLastName,
      });
    });

    it('maps the PRIMARY role to APPLICANT and everything else to CONTACT_PERSON', () => {
      expect(toCasedataStakeholder(stakeholder({ role: 'PRIMARY' })).roles).toEqual([Role.APPLICANT]);
      expect(toCasedataStakeholder(stakeholder({ role: 'CONTACT' })).roles).toEqual([Role.CONTACT_PERSON]);
      expect(toCasedataStakeholder(stakeholder({})).roles).toEqual([Role.CONTACT_PERSON]);
    });

    it('builds a postal address from the parts that are set', () => {
      expect(toCasedataStakeholder(stakeholder({ address: mockStreet, zipCode: mockZipCode, city: mockCity, careOf: mockCareOf })).addresses).toEqual(
        [{ addressCategory: 'POSTAL_ADDRESS', street: mockStreet, postalCode: mockZipCode, city: mockCity, careOf: mockCareOf }],
      );
    });

    it('defaults the missing address parts to empty strings', () => {
      expect(toCasedataStakeholder(stakeholder({ address: mockStreet })).addresses).toEqual([
        { addressCategory: 'POSTAL_ADDRESS', street: mockStreet, postalCode: '', city: '', careOf: '' },
      ]);
    });

    it('omits addresses entirely when the stakeholder has no street address', () => {
      expect(toCasedataStakeholder(stakeholder({ zipCode: mockZipCode, city: mockCity })).addresses).toEqual([]);
    });

    it('includes personId only when an externalId is present', () => {
      expect(toCasedataStakeholder(stakeholder({ externalId: mockOrganizationPartyId }))).toHaveProperty('personId', mockOrganizationPartyId);
      expect(toCasedataStakeholder(stakeholder({}))).not.toHaveProperty('personId');
    });

    it('includes organizationNumber only when one was resolved', () => {
      const withoutNumber = toCasedataStakeholder(stakeholder({ externalIdType: ExternalIdType.COMPANY }), undefined);
      expect(withoutNumber).not.toHaveProperty('organizationNumber');
      // A non-COMPANY stakeholder never carries one, even if a number is passed in.
      expect(toCasedataStakeholder(stakeholder({ externalIdType: ExternalIdType.PRIVATE }), mockOrganizationNumber)).not.toHaveProperty(
        'organizationNumber',
      );
    });

    it('defaults a missing last name to an empty string', () => {
      expect(toCasedataStakeholder(stakeholder({ firstName: mockFirstName })).lastName).toBe('');
    });
  });

  describe('toCasedataChannel', () => {
    it('maps the channels that have a CaseData counterpart', () => {
      expect(toCasedataChannel('EMAIL')).toBe(CasedataErrandDtoChannelEnum.EMAIL);
      expect(toCasedataChannel('WEB_UI')).toBe(CasedataErrandDtoChannelEnum.WEB_UI);
      expect(toCasedataChannel('ESERVICE')).toBe(CasedataErrandDtoChannelEnum.ESERVICE);
      expect(toCasedataChannel('PHONE')).toBe(CasedataErrandDtoChannelEnum.MOBILE);
    });

    it('falls back to WEB_UI for channels CaseData does not model', () => {
      // CHAT is the 0th member of the numeric SupportManagementChannels enum, so this
      // also guards against a falsy check creeping into the lookup.
      expect(toCasedataChannel('CHAT')).toBe(CasedataErrandDtoChannelEnum.WEB_UI);
      expect(toCasedataChannel('IN_PERSON')).toBe(CasedataErrandDtoChannelEnum.WEB_UI);
      expect(toCasedataChannel('SOCIAL_MEDIA')).toBe(CasedataErrandDtoChannelEnum.WEB_UI);
    });

    it('falls back to EMAIL for an unknown or missing channel', () => {
      expect(toCasedataChannel('CARRIER_PIGEON')).toBe(CasedataErrandDtoChannelEnum.EMAIL);
      expect(toCasedataChannel(undefined)).toBe(CasedataErrandDtoChannelEnum.EMAIL);
    });
  });

  describe('toFacilities', () => {
    it('turns each propertyDesignation value into a facility', () => {
      const parameters = [
        { key: 'other', values: ['ignored'] },
        { key: 'propertyDesignation', values: [mockPropertyDesignation, mockSecondaryPropertyDesignation] },
      ] as Parameter[];
      expect(toFacilities(parameters)).toEqual([
        { address: { propertyDesignation: mockPropertyDesignation } },
        { address: { propertyDesignation: mockSecondaryPropertyDesignation } },
      ]);
    });

    it('returns an empty list when the parameter is absent, valueless or undefined', () => {
      expect(toFacilities([{ key: 'other', values: ['x'] }] as Parameter[])).toEqual([]);
      expect(toFacilities([{ key: 'propertyDesignation' }] as Parameter[])).toEqual([]);
      expect(toFacilities(undefined)).toEqual([]);
    });
  });

  describe('toAttachmentDto', () => {
    const attachment = (fileName: string): ErrandAttachment => ({ id: '1', fileName, mimeType: mockMimeType }) as ErrandAttachment;

    it('base64-encodes the file data', () => {
      const fileData = new Uint8Array(Buffer.from(mockFileContent)).buffer;
      expect(toAttachmentDto(attachment(mockFileName), fileData, mockCasedataErrandNumber).file).toBe(
        Buffer.from(mockFileContent).toString('base64'),
      );
    });

    it('takes the extension from the last dot-separated segment', () => {
      const fileData = new Uint8Array([]).buffer;
      expect(toAttachmentDto(attachment(mockMultiDotFileName), fileData, mockCasedataErrandNumber).extension).toBe('pdf');
    });

    it('fills in the fixed category and channel and threads the errand number through', () => {
      const fileData = new Uint8Array([]).buffer;
      expect(toAttachmentDto(attachment(mockFileName), fileData, mockCasedataErrandNumber)).toEqual({
        file: '',
        category: 'OTHER',
        extension: 'pdf',
        mimeType: mockMimeType,
        name: mockFileName,
        note: '',
        errandNumber: mockCasedataErrandNumber,
        channel: 'WEB_UI',
      });
    });
  });
});
