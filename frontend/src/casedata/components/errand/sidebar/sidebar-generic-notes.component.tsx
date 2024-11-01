import { UiPhase } from '@casedata/interfaces/errand-phase';
import { CreateErrandNoteDto, ErrandNote, NoteType } from '@casedata/interfaces/errandNote';
import {
  deleteErrandNote,
  noteIsComment,
  noteIsTjansteanteckning,
  saveErrandNote,
} from '@casedata/services/casedata-errand-notes-service';
import { getErrand, isErrandAdmin } from '@casedata/services/casedata-errand-service';
import { useAppContext } from '@common/contexts/app.context';
import { sanitizedInline } from '@common/services/sanitizer-service';
import { getInitialsFromADUsername } from '@common/services/user-service';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Avatar, Button, Divider, FormControl, Modal, PopupMenu, Textarea, cx, useSnackbar } from '@sk-web-gui/react';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { UseFormReturn, useForm } from 'react-hook-form';

export const SidebarGenericNotes: React.FC<{
  label_plural: 'Kommentarer' | 'Tjänsteanteckningar';
  label_singular: 'Kommentar' | 'Tjänsteanteckning';
  noteType: NoteType;
}> = ({ label_plural, label_singular, noteType }) => {
  const { municipalityId, user, errand, setErrand, administrators, uiPhase } = useAppContext();
  const [selectedNote, setSelectedNote] = useState<ErrandNote>();
  const [notes, setNotes] = useState<ErrandNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [activePage, setActivePage] = useState(1);
  const [editNote, setEditNote] = useState(false);

  const toastMessage = useSnackbar();
  const pageSize = 8;

  const { register, handleSubmit, watch, setValue, getValues }: UseFormReturn<CreateErrandNoteDto> = useForm();

  const onSubmit = () => {
    const newNote: CreateErrandNoteDto = {
      title: '',
      text: getValues().text,
      noteType,
      extraParameters: {},
    };
    setError(false);
    setIsLoading(true);
    let createNote = true;

    if (noteIsTjansteanteckning(noteType)) {
      if (!isErrandAdmin(errand, user)) {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: `Du är inte handläggare på detta ärende.`,
          status: 'error',
        });
        setError(true);
        setIsLoading(false);
        createNote = false;
      } else if (uiPhase === UiPhase.registrerad) {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: `Ärendet är inte under granskning.`,
          status: 'error',
        });
        setError(true);
        setIsLoading(false);
        createNote = false;
      }
    }
    if (createNote) {
      return saveErrandNote(municipalityId, errand.id?.toString(), newNote)
        .then(() => {
          toastMessage({
            position: 'bottom',
            closeable: false,
            message: `${label_singular}en sparades`,
            status: 'success',
          });
          setIsLoading(false);
          getErrand(municipalityId, errand.id.toString()).then((res) => setErrand(res.errand));
          setValue('text', '');
        })
        .catch(() => {
          toastMessage({
            position: 'bottom',
            closeable: false,
            message: `Något gick fel när ${label_singular.toLocaleLowerCase()}en sparades`,
            status: 'error',
          });
          setError(true);
          setIsLoading(false);
          createNote = false;
        });
    }
  };

  const onError = () => {
    console.error('Something went wrong when saving note');
  };

  useEffect(() => {
    setNotes(
      errand?.notes
        .sort((a, b) =>
          dayjs(a.updated).isAfter(dayjs(b.updated)) ? 1 : dayjs(b.updated).isAfter(dayjs(a.updated)) ? -1 : 0
        )
        .reverse()
    );
    if (selectedNote) {
      setSelectedNote(errand?.notes.find((n) => n.id === selectedNote.id));
    }
  }, [errand]);

  const text = watch().text;

  const updateNote = (inNote) => {
    setValue('text', inNote.text);
    setValue('id', inNote.id);
    setEditNote(true);
  };

  const saveModifiedNote = () => {
    const editNote: CreateErrandNoteDto = {
      id: getValues().id,
      title: '',
      text: getValues().text,
      noteType,
      extraParameters: {},
    };

    return saveErrandNote(municipalityId, errand.id?.toString(), editNote)
      .then(() => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: `${label_singular}en sparades`,
          status: 'success',
        });
        getErrand(municipalityId, errand.id.toString()).then((res) => setErrand(res.errand));
        setValue('text', '');
        setEditNote(false);
      })
      .catch(() => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: `Något gick fel när ${label_singular.toLocaleLowerCase()}en sparades`,
          status: 'error',
        });
        setError(true);
        setIsLoading(false);
        return;
      });
  };

  const removeNote = (inNote) => {
    return deleteErrandNote(municipalityId, errand.id?.toString(), inNote.id?.toString())
      .then(() => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: `${label_singular}en togs bort`,
          status: 'success',
        });
        getErrand(municipalityId, errand.id.toString()).then((res) => setErrand(res.errand));
        setValue('text', '');
      })
      .catch(() => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: `Något gick fel när ${label_singular.toLocaleLowerCase()}en togs bort`,
          status: 'error',
        });
        return;
      });
  };

  return (
    <div className="relative h-full flex flex-col justify-start">
      <div className="px-0 flex justify-between items-center">
        <span className="text-base md:text-large xl:text-lead font-semibold">{label_plural}</span>
      </div>
      {notes && notes.length > 0 ? (
        <div className="mt-md flex flex-col" data-cy="notes-wrapper">
          {notes
            .filter((n) => n.noteType === noteType)
            .slice((activePage - 1) * pageSize, activePage * pageSize)
            .map((note, index) => {
              return (
                <>
                  <div
                    key={`note-${index}`}
                    onClick={() => setSelectedNote(note)}
                    className={cx('py-4 px-12', `relative w-full flex justify-between`)}
                    data-cy={`note-${index}`}
                  >
                    <div className="flex gap-md">
                      <div className="w-32">
                        <Avatar
                          rounded
                          color="juniskar"
                          size={'sm'}
                          title={note.createdBy}
                          initials={getInitialsFromADUsername(note.createdBy, administrators) || note.createdBy[0]}
                        />
                      </div>

                      <div>
                        <p
                          className="my-0 mr-md"
                          dangerouslySetInnerHTML={{
                            __html: sanitizedInline(note.text || ''),
                          }}
                          data-cy="note-text"
                        ></p>

                        <p className="my-0 flex justify-between">
                          <span className="text-xs">{dayjs(note.updated).format('D MMM, HH:mm')}</span>
                        </p>
                      </div>
                    </div>
                    {noteIsComment(note.noteType) ? (
                      <div className="relative">
                        <PopupMenu position="left">
                          <PopupMenu.Button
                            size="sm"
                            aria-label="Allternativ"
                            iconButton
                            className="bg-transparent"
                            variant="ghost"
                          >
                            <LucideIcon name="ellipsis" />
                          </PopupMenu.Button>
                          <PopupMenu.Panel>
                            <PopupMenu.Items>
                              <PopupMenu.Group>
                                <PopupMenu.Item>
                                  <Button
                                    leftIcon={<LucideIcon name="pencil" />}
                                    onClick={() => {
                                      updateNote(note);
                                    }}
                                  >
                                    Ändra
                                  </Button>
                                </PopupMenu.Item>
                              </PopupMenu.Group>
                              <PopupMenu.Group>
                                <PopupMenu.Item>
                                  <Button
                                    leftIcon={<LucideIcon name="trash" />}
                                    onClick={() => {
                                      removeNote(note);
                                    }}
                                  >
                                    Ta bort
                                  </Button>
                                </PopupMenu.Item>
                              </PopupMenu.Group>
                            </PopupMenu.Items>
                          </PopupMenu.Panel>
                        </PopupMenu>
                      </div>
                    ) : null}
                  </div>
                  <Divider />
                </>
              );
            })}
        </div>
      ) : (
        <div className="my-md">Det finns inga {label_plural.toLocaleLowerCase()}</div>
      )}
      {!editNote && (
        <div className="w-full mt-xl flex flex-col items-start gap-12">
          <FormControl id="note" className="w-full">
            <Textarea
              className="w-full"
              rows={5}
              placeholder={`Ny ${label_singular.toLocaleLowerCase()}`}
              aria-label={`Ny ${label_singular.toLocaleLowerCase()}`}
              value={text}
              {...register('text')}
              data-cy={`${noteType}-note-input`}
            ></Textarea>
          </FormControl>
          <Button
            color="primary"
            disabled={!errand?.id || text === '' || (noteIsTjansteanteckning(noteType) && !isErrandAdmin(errand, user))}
            loadingText="Sparar"
            loading={isLoading}
            size="sm"
            onClick={handleSubmit(onSubmit, onError)}
            data-cy={`save-${noteType}-note-button`}
          >
            Spara
          </Button>
        </div>
      )}

      <Modal show={editNote} className="w-[43rem]" onClose={() => setEditNote(false)} label={'Ändra kommentar'}>
        <Modal.Content>
          <Textarea rows={4} className="w-full" {...register('text')}></Textarea>
        </Modal.Content>
        <Modal.Footer>
          <Button className="w-full" variant="primary" onClick={() => saveModifiedNote()}>
            Spara
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};
