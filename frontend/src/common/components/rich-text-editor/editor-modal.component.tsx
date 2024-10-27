import { Dialog, Transition } from '@headlessui/react';
import { Button, FormErrorMessage } from '@sk-web-gui/react';
import { Fragment, useEffect, useRef, useState } from 'react';
import { RichTextEditor } from './rich-text-editor.component';

export const EditorModal: React.FC<{
  isOpen: boolean;
  modalHeader: string;
  modalBody: string;
  readOnly?: boolean;
  onChange: (val: any, b?: any, c?: any, d?: any) => void;
  onClose: () => void;
  onCancel: () => void;
  onContinue: () => Promise<boolean>;
}> = ({ isOpen, modalHeader, modalBody, readOnly = false, onChange, onClose, onCancel, onContinue }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const quillRef = useRef(null);

  const modalFocus = useRef(null);
  const setModalFocus = () => {
    setTimeout(() => {
      modalFocus.current && modalFocus.current.focus();
    });
  };

  const closeModal = () => {
    setError(false);
    const editor = quillRef.current.getEditor();
    const s = editor.getContents();
    onChange(s);
    onClose();
  };

  useEffect(() => {
    setModalFocus();
  }, []);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        data-cy="editor-modal"
        className="fixed inset-0 z-20 overflow-y-auto bg-opacity-50 bg-gray-500"
        onClose={closeModal}
      >
        <div className="min-h-screen px-4 text-center">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Dialog.Overlay className="fixed inset-0" />
          </Transition.Child>

          {/* This element is to trick the browser into centering the modal contents. */}
          <span className="inline-block h-screen align-middle" aria-hidden="true">
            &#8203;
          </span>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div className="inline-block w-[75vw] h-[85vh] p-xl py-lg my-8 text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <div className="h-[100%] flex flex-col">
                <Dialog.Title as="h1" className="text-xl text-center my-sm">
                  {modalHeader}
                </Dialog.Title>
                <div className="flex flex-col min-h-[26rem] grow justify-center my-md">
                  <RichTextEditor
                    ref={quillRef}
                    value={modalBody}
                    toggleModal={closeModal}
                    isMaximizable={false}
                    readOnly={readOnly}
                    onChange={() => {}}
                  />
                </div>
                {error && (
                  <div className="flex flex-col justify-center my-md">
                    <FormErrorMessage>Något gick fel.</FormErrorMessage>
                  </div>
                )}
                <div className="shrink-0 min-h-[4rem] flex flex-row justify-end my-sm">
                  <Button
                    data-cy="verification-yes"
                    variant="primary"
                    type="button"
                    color="primary"
                    loadingText="Sparar"
                    loading={isLoading}
                    onClick={closeModal}
                  >
                    Stäng
                  </Button>
                </div>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};
