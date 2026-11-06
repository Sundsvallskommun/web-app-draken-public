import { upstreamClientErrorMessage } from '@/services/api.service';

describe('upstreamClientErrorMessage', () => {
  test('reads the reason out of a constraint violation', () => {
    const problem = {
      title: 'Constraint Violation',
      status: 400,
      violations: [{ field: 'updateErrand.errand.jsonParameters[0]', message: 'Bad Request: Schema validation failed: missing required field' }],
    };

    expect(upstreamClientErrorMessage(problem)).toBe('Bad Request: Schema validation failed: missing required field');
  });

  test('keeps every violation when more than one field was rejected', () => {
    const problem = {
      title: 'Constraint Violation',
      violations: [{ message: 'must not be blank' }, { message: 'can only contain A-Z, a-z, 0-9, - and _' }],
    };

    expect(upstreamClientErrorMessage(problem)).toBe('must not be blank; can only contain A-Z, a-z, 0-9, - and _');
  });

  test('skips violations that carry no message of their own', () => {
    const problem = { violations: [{ field: 'errand.status' }, { message: '  ' }] };

    expect(upstreamClientErrorMessage(problem)).toBe('Request failed');
  });

  test('falls back to the detail of a problem without violations', () => {
    expect(upstreamClientErrorMessage({ title: 'Bad Request', detail: 'Errand is locked' })).toBe('Errand is locked');
  });

  test('does not pass a bare problem title off as a reason', () => {
    expect(upstreamClientErrorMessage({ title: 'Constraint Violation', status: 400 })).toBe('Request failed');
    expect(upstreamClientErrorMessage({ title: 'Bad Request' })).toBe('Request failed');
  });

  test('keeps a title that says something', () => {
    expect(upstreamClientErrorMessage({ title: 'Namespace is unknown' })).toBe('Namespace is unknown');
  });

  test('answers for a body that is not a problem at all', () => {
    expect(upstreamClientErrorMessage('Municipality id missing')).toBe('Request failed');
    expect(upstreamClientErrorMessage(null)).toBe('Request failed');
    expect(upstreamClientErrorMessage(undefined)).toBe('Request failed');
  });
});
