import { describe, expect, it } from 'vitest';

import { toPropertyRow } from './property-row';

const selected = (properties: Record<string, unknown>) => ({
  id: 'Fastighet_yta.1',
  layerTitle: 'Fastigheter',
  properties,
});

describe('toPropertyRow', () => {
  it('maps property attributes to a row', () => {
    expect(
      toPropertyRow(
        selected({ FBET: 'GRANLO 1:53', TRAKT: 'GRANLO', AREA: 836, link: 'https://fbwebb.example/rapport?UUID=1' })
      )
    ).toEqual({
      id: 'Fastighet_yta.1',
      designation: 'GRANLO 1:53',
      fullDesignation: 'SUNDSVALL GRANLO 1:53',
      tract: 'GRANLO',
      areaSquareMeters: 836,
      reportUrl: 'https://fbwebb.example/rapport?UUID=1',
    });
  });

  it('skips features that are not properties', () => {
    expect(toPropertyRow(selected({ NAMN: 'Något annat' }))).toBeNull();
    expect(toPropertyRow(selected({ FBET: '   ' }))).toBeNull();
  });

  it('drops non-web links and non-numeric areas', () => {
    const row = toPropertyRow(selected({ FBET: 'GRANLO 1:53', AREA: '836', link: 'javascript:alert(1)' }));
    expect(row?.reportUrl).toBeNull();
    expect(row?.areaSquareMeters).toBeNull();
  });
});
