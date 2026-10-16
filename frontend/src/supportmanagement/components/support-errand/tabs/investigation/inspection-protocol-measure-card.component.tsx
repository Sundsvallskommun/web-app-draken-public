import type { ErrandAttachment } from '@common/data-contracts/supportmanagement/data-contracts';
import { Button, FormControl, FormLabel, Textarea } from '@sk-web-gui/react';
import { ACCEPTED_UPLOAD_FILETYPES } from '@supportmanagement/services/support-attachment-service';
import { SUPPORT_MEASURE_RESULTS, type SupportMeasureRow } from '@supportmanagement/services/support-measure-service';
import { Paperclip, Trash2 } from 'lucide-react';
import { FC, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const ACCEPT = ACCEPTED_UPLOAD_FILETYPES.map((extension) => `.${extension}`).join(',');
// What Support Management takes as a measure description.
const NOTE_MAX_LENGTH = 3000;

const RESULT_COLOR: Record<string, 'gronsta' | 'error' | 'primary'> = {
  COMPLETED: 'gronsta',
  NOT_COMPLETED: 'error',
  NOT_APPLICABLE: 'primary',
};

/** One control point: its result, a note and the photos linked to it. Photos need the row to be saved first. */
export const InspectionProtocolMeasureCard: FC<{
  index: number;
  row: SupportMeasureRow;
  attachments: ErrandAttachment[];
  readOnly: boolean;
  busy: boolean;
  onChange: (row: SupportMeasureRow) => void;
  onUpload: (file: File) => void;
  onUnlink: (attachment: ErrandAttachment) => void;
  onOpen: (attachment: ErrandAttachment) => void;
}> = ({ index, row, attachments, readOnly, busy, onChange, onUpload, onUnlink, onOpen }) => {
  const { t } = useTranslation();
  const fileInput = useRef<HTMLInputElement>(null);
  const key = row.id ?? `new-${index}`;

  return (
    <section className="border-1 rounded-12 px-16 pt-12 pb-16 flex flex-col gap-12" data-cy={`measure-${key}`}>
      <div className="flex items-center gap-8">
        <span className="w-24 h-24 rounded-6 bg-vattjom-surface-primary text-white text-small font-bold flex items-center justify-center">
          {index + 1}
        </span>
        <span className="font-bold">{row.title}</span>
      </div>
      {/* relative keeps the sr-only legend (absolute) from stretching the page below the content scroller */}
      <fieldset className="flex gap-8 relative">
        <legend className="sr-only">{row.title}</legend>
        {SUPPORT_MEASURE_RESULTS.map(({ result, translationKey }) => {
          const selected = row.result === result;
          return (
            <Button
              key={result}
              size="sm"
              variant={selected ? 'primary' : 'secondary'}
              rounded
              color={RESULT_COLOR[result]}
              aria-pressed={selected}
              disabled={readOnly}
              onClick={() => onChange({ ...row, result: selected ? '' : result })}
              data-cy={`measure-result-${result}`}
            >
              {t(translationKey)}
            </Button>
          );
        })}
      </fieldset>
      {/* relative keeps the sr-only label (absolute) from stretching the page below the content scroller */}
      <FormControl id={`measure-note-${key}`} className="w-full relative">
        <FormLabel className="sr-only">{t('common:inspection_protocol.note')}</FormLabel>
        <Textarea
          className="w-full"
          rows={2}
          maxLength={NOTE_MAX_LENGTH}
          value={row.description}
          placeholder={t('common:inspection_protocol.note_placeholder', { title: row.title })}
          disabled={readOnly}
          onChange={(event) => onChange({ ...row, description: event.target.value })}
          data-cy="measure-note"
        />
      </FormControl>
      {attachments.length > 0 ? (
        <ul className="m-0 p-0 list-none flex flex-col gap-4">
          {attachments.map((attachment) => (
            <li key={attachment.id} className="flex items-center gap-8">
              <Button variant="link" onClick={() => onOpen(attachment)}>
                {attachment.fileName}
              </Button>
              <Button
                iconButton
                variant="tertiary"
                showBackground={false}
                size="sm"
                disabled={readOnly || busy}
                aria-label={t('common:inspection_protocol.remove_attachment', { fileName: attachment.fileName })}
                onClick={() => onUnlink(attachment)}
              >
                <Trash2 size={16} />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {row.id ? (
        <div>
          <Button
            variant="primary"
            inverted
            color="vattjom"
            size="sm"
            leftIcon={<Paperclip size={16} />}
            disabled={readOnly || busy}
            loading={busy}
            onClick={() => fileInput.current?.click()}
            data-cy="measure-upload"
          >
            {t('common:inspection_protocol.add_photo')}
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPT}
            className="hidden"
            data-cy="measure-file"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) onUpload(file);
              event.currentTarget.value = '';
            }}
          />
        </div>
      ) : null}
    </section>
  );
};
