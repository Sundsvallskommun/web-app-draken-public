import { CreateErrandDto } from '@/interfaces/errand.interface';
import { makeErrandApiData } from '@/services/errand.service';

// Minimal errand input; individual tests set only the fields they exercise.
const input = (overrides: Partial<CreateErrandDto> = {}): CreateErrandDto => ({ ...overrides }) as CreateErrandDto;

describe('errand.service', () => {
  describe('makeErrandApiData', () => {
    it('parses a non-empty errandId into a numeric id', () => {
      expect(makeErrandApiData(input(), '42')).toEqual({ id: 42 });
    });

    it('omits id when errandId is empty', () => {
      expect(makeErrandApiData(input({ caseType: 'PARKING' } as Partial<CreateErrandDto>), '')).toEqual({ caseType: 'PARKING' });
    });

    it('passes through the fields that are set', () => {
      const result = makeErrandApiData(
        input({
          caseType: 'PARKING',
          description: 'Ansökan om parkeringstillstånd',
          phase: 'Utredning',
          diaryNumber: 'DIA-1',
        } as Partial<CreateErrandDto>),
        '7',
      );
      expect(result).toEqual({
        id: 7,
        caseType: 'PARKING',
        description: 'Ansökan om parkeringstillstånd',
        phase: 'Utredning',
        diaryNumber: 'DIA-1',
      });
    });

    it('passes statuses through under the statuses key', () => {
      const statuses = [{ statusType: 'Under granskning', description: 'Granskning', created: '2026-01-01T00:00:00Z' }];
      expect(makeErrandApiData(input({ statuses } as Partial<CreateErrandDto>), '1')).toEqual({ id: 1, statuses });
    });

    it('drops falsy/absent optional fields', () => {
      const result = makeErrandApiData(input({ caseType: 'PARKING', description: '' } as Partial<CreateErrandDto>), '1');
      expect(result).toEqual({ id: 1, caseType: 'PARKING' });
      expect(result).not.toHaveProperty('description');
    });

    it('includes suspension only when both suspendedFrom and suspendedTo are present', () => {
      const both = makeErrandApiData(
        input({ suspension: { suspendedFrom: '2026-01-01', suspendedTo: '2026-02-01' } } as Partial<CreateErrandDto>),
        '1',
      );
      expect(both.suspension).toEqual({ suspendedFrom: '2026-01-01', suspendedTo: '2026-02-01' });

      const partial = makeErrandApiData(input({ suspension: { suspendedFrom: '2026-01-01' } } as Partial<CreateErrandDto>), '1');
      expect(partial).not.toHaveProperty('suspension');
    });

    it('includes channel only when the field exists and is truthy', () => {
      const withChannel = makeErrandApiData(input({ channel: 'WEB_UI' } as Partial<CreateErrandDto>), '1');
      expect(withChannel.channel).toBe('WEB_UI');

      const withoutChannel = makeErrandApiData(input({ caseType: 'PARKING' } as Partial<CreateErrandDto>), '1');
      expect(withoutChannel).not.toHaveProperty('channel');
    });
  });
});
