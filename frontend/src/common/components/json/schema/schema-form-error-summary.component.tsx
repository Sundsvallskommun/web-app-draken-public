import { Alert } from '@sk-web-gui/react';
import { useEffect, useId, useRef } from 'react';

import type { SchemaFormError } from '../utils/schema-form-error-handling';

export interface SchemaErrorNavigation {
  fieldId: string;
}

export function SchemaFormErrorSummary({
  errors,
  onNavigate,
}: Readonly<{ errors: readonly SchemaFormError[]; onNavigate: (target: SchemaErrorNavigation) => void }>) {
  const headingId = useId();
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (errors.length === 0) return;
    summaryRef.current?.focus({ preventScroll: true });
    summaryRef.current?.scrollIntoView({ block: 'start' });
  }, [errors]);

  if (errors.length === 0) return null;

  return (
    <div
      ref={summaryRef}
      tabIndex={-1}
      role="alert"
      aria-labelledby={headingId}
      className="mb-24 scroll-mt-24"
      data-cy="schema-form-error-summary"
    >
      <Alert type="error">
        <Alert.Icon />
        <Alert.Content>
          <Alert.Content.Title>
            <h3 id={headingId}>Uppgifterna kunde inte sparas</h3>
          </Alert.Content.Title>
          <p>Kontrollera följande uppgifter och spara igen. Välj ett fel för att gå till fältet.</p>
          <ul className="mt-12 list-disc pl-24">
            {errors.map((error) => (
              <li key={`${error.fieldId}:${error.message}`}>
                <a
                  href={`#${error.fieldId}`}
                  className="underline"
                  onClick={(event) => {
                    event.preventDefault();
                    onNavigate({ fieldId: error.fieldId });
                  }}
                >
                  {error.label}: {error.message}
                </a>
              </li>
            ))}
          </ul>
        </Alert.Content>
      </Alert>
    </div>
  );
}
