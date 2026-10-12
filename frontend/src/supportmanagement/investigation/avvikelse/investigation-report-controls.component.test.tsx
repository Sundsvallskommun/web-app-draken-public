// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { afterEach, expect, test, vi } from 'vitest';

import { InvestigationReportControls } from './investigation-report-controls.component';

afterEach(cleanup);

const controls = (props: Partial<ComponentProps<typeof InvestigationReportControls>> = {}) =>
  render(
    <InvestigationReportControls
      documentKey="utredning-enhetschef"
      completedInDraft={false}
      locked={false}
      dirty={false}
      busy={false}
      canEdit
      reports={[]}
      onGenerate={vi.fn()}
      onPreview={vi.fn()}
      onUnlock={vi.fn()}
      {...props}
    />
  );

const NO_MEASURES = 'Det finns inga åtgärder i ärendet. Lägg till åtgärder under fliken Åtgärder.';

// Ä9. Measures are registered in another tab, and every investigation leads there from where it is finished.
test('leads to the Åtgärder tab wherever the errand has measures, and nowhere it has not', () => {
  const onGoToMeasures = vi.fn();
  const view = controls({ onGoToMeasures });
  expect(screen.getByText('Åtgärder registreras under fliken Åtgärder.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Gå till Åtgärder' }));
  expect(onGoToMeasures).toHaveBeenCalledTimes(1);

  view.unmount();
  controls();
  expect(screen.queryByRole('button', { name: 'Gå till Åtgärder' })).toBeNull();
});

test('reminds the investigator who proposes measures of them once the investigation is marked complete', () => {
  controls({ onGoToMeasures: vi.fn(), proposesMeasures: true, completedInDraft: true });
  expect(screen.getByText(/Har du förslag på åtgärder\?/u)).toBeTruthy();
  expect(screen.queryByText('Åtgärder registreras under fliken Åtgärder.')).toBeNull();
});

// Ä7. Information for the one finishing the investigation, and only when there is something to tell.
test('says that the errand has no measures when the investigation is marked complete without any', () => {
  const view = controls({ onGoToMeasures: vi.fn(), completedInDraft: true, withoutMeasures: true });
  expect(screen.getByText(NO_MEASURES)).toBeTruthy();
  // The answer is still Ja: nothing about measures keeps the report from being created.
  expect(screen.getByRole('button', { name: 'Skapa rapport' })).toHaveProperty('disabled', false);

  view.rerender(
    <InvestigationReportControls
      documentKey="utredning-enhetschef"
      completedInDraft
      locked={false}
      dirty={false}
      busy={false}
      canEdit
      reports={[]}
      onGenerate={vi.fn()}
      onPreview={vi.fn()}
      onUnlock={vi.fn()}
      onGoToMeasures={vi.fn()}
      withoutMeasures={false}
    />
  );
  expect(screen.queryByText(NO_MEASURES)).toBeNull();
});

test('says nothing about missing measures while the investigation is still being written', () => {
  controls({ onGoToMeasures: vi.fn(), completedInDraft: false, withoutMeasures: true });
  expect(screen.queryByText(NO_MEASURES)).toBeNull();
});
