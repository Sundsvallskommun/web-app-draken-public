import { NoteType } from '@casedata/interfaces/errandNote';
import { noteIsComment, noteIsTjansteanteckning } from '@casedata/services/casedata-errand-notes-service';
import { useAppContext } from '@common/contexts/app.context';
import { sanitizedInline } from '@common/services/sanitizer-service';
import { getInitialsFromADUsername } from '@common/services/user-service';
import { yupResolver } from '@hookform/resolvers/yup';
import LucideIcon from '@sk-web-gui/lucide-icon';
import {
  Avatar,
  Button,
  Divider,
  FormControl,
  Input,
  Modal,
  PopupMenu,
  Textarea,
  cx,
  useConfirm,
  useSnackbar,
} from '@sk-web-gui/react';
import { GenericNote } from '@supportmanagement/components/notes-list/notes-list.component';
import { getSupportErrandById } from '@supportmanagement/services/support-errand-service';
import {
  SupportNote,
  deleteSupportNote,
  getSupportNotes,
  saveSupportNote,
  updateSupportNote,
} from '@supportmanagement/services/support-note-service';
import dayjs from 'dayjs';
import { Fragment, useEffect, useState } from 'react';
import { UseFormReturn, useForm } from 'react-hook-form';
import * as yup from 'yup';

interface ErrandNotesTabFormModel {
  id?: string;
  partyId?: string;
  text: string;
}

let formSchema = yup
  .object({
    id: yup.string().optional(),
    partyId: yup.string().optional(),
    text: yup.string().required('Text måste anges'),
  })
  .required();

export const SidebarGenericNotes: React.FC<{
  label_plural: 'Kommentarer' | 'Tjänsteanteckningar';
  label_singular: 'Kommentar' | 'Tjänsteanteckning';
  noteType: NoteType;
}> = ({ label_plural, label_singular, noteType }) => {
  const { user, supportErrand, setSupportErrand, administrators, municipalityId } = useAppContext();
  const [selectedNote, setSelectedNote] = useState<GenericNote>();
  const [notes, setNotes] = useState<SupportNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activePage, setActivePage] = useState(1);
  const [editNote, setEditNote] = useState(false);
  const confirm = useConfirm();
  const toastMessage = useSnackbar();
  const pageSize = 8;
  const [allowed, setAllowed] = useState(false);
  // useEffect(() => {
  //   const _a = validateAction(errand, user);
  //   setAllowed(_a);
  // }, [user, errand]);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    getValues,
    getFieldState,
    trigger,
    formState,
    formState: { errors },
  }: UseFormReturn<ErrandNotesTabFormModel, any, undefined> = useForm({
    resolver: yupResolver(formSchema) as any,
  });

  const onSubmit = (note: ErrandNotesTabFormModel) => {
    setIsLoading(true);

    let createNote = true;

    const apiCall = note.id
      ? updateSupportNote(supportErrand.id, municipalityId, note.id, note.text)
      : saveSupportNote(supportErrand.id, municipalityId, note.text, note.partyId);

    return apiCall
      .then(() => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: `${label_singular}en sparades`,
          status: 'success',
        });
        setIsLoading(false);
        getSupportErrandById(supportErrand.id, municipalityId).then((res) => setSupportErrand(res.errand));
        setValue('text', '');
      })
      .catch((e) => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: `Något gick fel när ${label_singular.toLocaleLowerCase()}en sparades`,
          status: 'error',
        });
        setIsLoading(false);
        createNote = false;
        // TODO UI-phase rule for internal notes?
      });
  };

  const onError = () => {
    console.error('Something went wrong when saving note');
  };

  useEffect(() => {
    getSupportNotes(supportErrand.id, municipalityId).then((res) => setNotes(res.notes));
    if (selectedNote) {
      setSelectedNote(notes.map(makeGeneric).find((n) => n.id === selectedNote.id));
    }
  }, [supportErrand]);

  const text = watch().text;

  const updateNote = (inNote: GenericNote) => {
    setValue('text', inNote.body);
    setValue('id', inNote.id);
    setEditNote(true);
  };

  const saveModifiedNote = () => {
    const note: ErrandNotesTabFormModel = getValues();
    return updateSupportNote(supportErrand.id, municipalityId, note.id, note.text)
      .then(() => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: `${label_singular}en sparades`,
          status: 'success',
        });
        getSupportErrandById(supportErrand.id, municipalityId).then((res) => setSupportErrand(res.errand));
        setValue('text', '');
        setValue('id', '');
        setEditNote(false);
      })
      .catch((e) => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: `Något gick fel när ${label_singular.toLocaleLowerCase()}en sparades`,
          status: 'error',
        });
        setIsLoading(false);
        return;
      });
  };

  const removeNote = (inNote) => {
    return deleteSupportNote(supportErrand.id, municipalityId, inNote.id)
      .then(() => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: `${label_singular}en togs bort`,
          status: 'success',
        });
        getSupportErrandById(supportErrand.id, municipalityId).then((res) => setSupportErrand(res.errand));
        setValue('text', '');
      })
      .catch((e) => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: `Något gick fel när ${label_singular.toLocaleLowerCase()}en togs bort`,
          status: 'error',
        });
        return;
      });
  };

  const makeGeneric: (note: SupportNote) => GenericNote = (note) => {
    return {
      id: note.id,
      title: note.subject,
      body: note.body,
      createdBy: note.createdBy,
      date: note.created,
      signed: false,
    };
  };

  useEffect(() => {
    const primaryStakeholder = supportErrand.customer.find((x) => x.role === 'PRIMARY');
    if (primaryStakeholder?.externalIdType === 'PRIVATE' && primaryStakeholder?.externalId) {
      setValue('partyId', primaryStakeholder?.externalId);
    } else {
      setValue('partyId', '');
    }
  }, [supportErrand]);

  return (
    <div className="relative h-full flex flex-col justify-start">
      <div className="px-0 flex justify-between items-center">
        <span className="text-base md:text-large xl:text-lead font-semibold">{label_plural}</span>
      </div>
      {notes && notes.length > 0 ? (
        <div className="mt-md flex flex-col" data-cy="noteslist">
          {notes
            .slice((activePage - 1) * pageSize, activePage * pageSize)
            .map(makeGeneric)
            .map((note, index) => {
              return (
                <Fragment key={`note-${index}`}>
                  <div
                    onClick={() => setSelectedNote(note)}
                    className={cx('py-4 px-12', `relative w-full flex justify-between`)}
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
                        <p className="my-0">
                          <strong
                            className="mr-md"
                            dangerouslySetInnerHTML={{
                              __html: sanitizedInline(note.body || ''),
                            }}
                          />
                        </p>

                        <p className="my-0 flex justify-between">
                          <span className="text-xs">{dayjs(note.date).format('D MMM, HH:mm')}</span>
                        </p>
                      </div>
                    </div>
                    <div className="relative">
                      <PopupMenu position="left">
                        <PopupMenu.Button
                          size="sm"
                          aria-label="Allternativ"
                          data-cy={`options-${note.id}`}
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
                                  data-cy="edit-note-button"
                                  disabled={noteIsComment(noteType) && supportErrand.status === 'SOLVED'}
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
                                  data-cy="delete-note-button"
                                  leftIcon={<LucideIcon name="trash" />}
                                  onClick={() => {
                                    confirm
                                      .showConfirmation(
                                        'Ta bort kommentar',
                                        'Vill du ta bort kommentaren?',
                                        'Ja',
                                        'Nej',
                                        'info',
                                        'info'
                                      )
                                      .then((confirmed) => {
                                        if (confirmed) {
                                          removeNote(note);
                                        }
                                      });
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
                  </div>
                  <Divider />
                </Fragment>
              );
            })}
        </div>
      ) : (
        <div className="my-md">Det finns inga {label_plural.toLocaleLowerCase()}</div>
      )}
      {!editNote && (
        <div className="w-full mt-xl flex flex-col items-start gap-12">
          <Input type="hidden" {...register('id')} />
          <Input type="hidden" {...register('partyId')} />
          <FormControl id="note" className="w-full">
            <Textarea
              className="w-full"
              rows={5}
              placeholder={`Ny ${label_singular.toLocaleLowerCase()}`}
              aria-label={`Ny ${label_singular.toLocaleLowerCase()}`}
              value={text}
              {...register('text')}
            ></Textarea>
          </FormControl>
          <Button
            color="primary"
            disabled={
              !supportErrand?.id ||
              text === '' ||
              (noteIsTjansteanteckning(noteType) && !allowed) ||
              (noteIsComment(noteType) && supportErrand.status === 'SOLVED')
            }
            loadingText="Sparar"
            loading={isLoading}
            data-cy="save-newcomment"
            size="sm"
            onClick={handleSubmit(onSubmit, onError)}
          >
            Spara
          </Button>
        </div>
      )}

      <Modal show={editNote} className="w-[43rem]" onClose={() => setEditNote(false)} label={'Ändra kommentar'}>
        <Modal.Content>
          <Textarea rows={4} data-cy="edit-notes-input" className="w-full" {...register('text')}></Textarea>
        </Modal.Content>
        <Modal.Footer>
          <Button data-cy="save-updatedcomment" className="w-full" variant="primary" onClick={() => saveModifiedNote()}>
            Spara
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};
