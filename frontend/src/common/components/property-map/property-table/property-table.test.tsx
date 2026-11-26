import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import PropertyTable from './property-table.component';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key} ${JSON.stringify(options)}` : key),
  }),
}));

describe('PropertyTable', () => {
  it('shows an empty state when nothing is selected', () => {
    render(<PropertyTable features={[]} />);
    expect(screen.getByText('properties_empty')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('lists selected properties and skips other features', () => {
    render(
      <PropertyTable
        features={[
          {
            id: 'Fastighet_yta.1',
            layerTitle: 'Fastigheter',
            properties: { FBET: 'GRANLO 1:53', TRAKT: 'GRANLO', AREA: 12345, link: 'https://fbwebb.example/r?UUID=1' },
          },
          { id: 'other.1', layerTitle: 'Annat', properties: { NAMN: 'x' } },
        ]}
      />
    );

    expect(screen.getByText('properties_heading {"count":1}')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(2);
    expect(screen.getByRole('cell', { name: 'GRANLO 1:53' })).toBeInTheDocument();
    expect(screen.getByText('12 345 m²')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://fbwebb.example/r?UUID=1');
  });
});
