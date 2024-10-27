import { ContextMenu } from '@supportmanagement/components/context-menu/context-menu.component';
import { useAppContext } from '@common/contexts/app.context';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import sanitized from '@common/services/sanitizer-service';
import { cx, Pagination } from '@sk-web-gui/react';
import dayjs from 'dayjs';
import { useState } from 'react';

export interface GenericNote {
  id: string;
  title: string;
  body: string;
  createdBy: string;
  date: string;
  signed?: boolean;
}

export const NotesList: React.FC<{
  locked?: boolean;
  notes: GenericNote[];
  actions: { select?: Function; sign?: Function; delete?: Function };
}> = (props) => {
  const [activePage, setActivePage] = useState(1);
  const [selectedNote, setSelectedNote] = useState<GenericNote>();
  const { user } = useAppContext();
  const pageSize = 3;
  const { locked = false, notes } = props;

  const select = (note: GenericNote) => {
    setSelectedNote(note);
    props.actions.select(note.id);
  };

  return (
    <>
      <div className="flex flex-col">
        {notes.slice((activePage - 1) * pageSize, activePage * pageSize).map((note, index) => {
          const items = [];
          if (typeof props.actions.select === 'function') {
            items.push({
              action: () => {},
              target: (
                <div
                  onClick={() => {
                    select(note);
                  }}
                >
                  <EditOutlinedIcon className="material-icon mr-sm" aria-hidden="true" />
                  <span className="inline">Redigera</span>
                </div>
              ),
            });
          }
          if (typeof props.actions.sign === 'function') {
            items.push({
              action: () => {},
              target: (
                <div onClick={() => props.actions.sign()}>
                  <LockOutlinedIcon className="material-icon mr-sm" aria-hidden="true" />
                  <span className="inline">Signera</span>
                </div>
              ),
            });
          }
          if (typeof props.actions.delete === 'function') {
            items.push({
              action: () => {},
              target: (
                <div onClick={() => props.actions.delete(note.id)}>
                  <DeleteOutlineIcon fontSize="large" className="mr-sm" aria-hidden="true" />
                  <span className="inline">Ta bort</span>
                </div>
              ),
            });
          }
          return (
            <div
              key={`note-${index}`}
              className={cx(
                `relative border border-gray-stroke rounded-sm my-sm py-sm px-lg text-md ${
                  selectedNote?.id === note.id ? 'lg:border-2 lg:border-hover shadow-hover drop-shadow-xl' : null
                }`
              )}
            >
              {locked || (user.username === note.createdBy && note.signed === true) ? (
                <LockOutlinedIcon className="material-icon absolute right-6 top-6" aria-hidden="true" />
              ) : user.username === note.createdBy || user.name === note.createdBy ? (
                <ContextMenu items={items} className="absolute right-4 top-4" />
              ) : (
                ''
              )}
              <p>
                <strong
                  className="mr-md"
                  dangerouslySetInnerHTML={{
                    __html: sanitized(note.createdBy || ''),
                  }}
                ></strong>
                {dayjs(note.date).format('YYYY-MM-DD HH:mm')}
              </p>
              <p>
                <strong
                  dangerouslySetInnerHTML={{
                    __html: sanitized(note.title || ''),
                  }}
                ></strong>{' '}
              </p>
              <p
                className="[&>ul]:list-disc [&>ol]:list-decimal [&>ul]:ml-lg [&>ol]:ml-lg"
                dangerouslySetInnerHTML={{
                  __html: sanitized(note.body || ''),
                }}
              ></p>
            </div>
          );
        })}
      </div>
      {Math.ceil(props.notes.length / pageSize) > 1 && (
        <div className="mx-lg my-md">
          <Pagination
            pages={Math.ceil(props.notes.length / pageSize)}
            activePage={activePage}
            changePage={(p) => {
              setActivePage(p);
            }}
          />
        </div>
      )}
    </>
  );
};
