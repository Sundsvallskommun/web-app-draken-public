import { Dialog, Transition } from '@headlessui/react';
import { Button, FormErrorMessage } from '@sk-web-gui/react';
import { Fragment, useEffect, useRef, useState } from 'react';

export const VerificationModal: React.FC<{
  isOpen: boolean;
  modalHeader: string;
  modalBody: string;
  onClose: () => void;
  onCancel: () => void;
  onContinue: () => Promise<boolean>;
}> = ({ isOpen, modalHeader, modalBody, onClose, onCancel, onContinue }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  const modalFocus = useRef(null);
  const setModalFocus = () => {
    setTimeout(() => {
      modalFocus.current && modalFocus.current.focus();
    });
  };

  const closeModal = () => {
    setError(false);
    onClose();
  };

  useEffect(() => {
    isOpen && setModalFocus;
  }, [isOpen]);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="fixed inset-0 z-20 overflow-y-auto bg-opacity-50 bg-gray-500" onClose={closeModal}>
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
            <div className="inline-block w-[440px] p-xl py-lg my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <button ref={modalFocus} className="modal-close-btn" onClick={closeModal}>
                <span className="material-icons-outlined" aria-label="Stäng modal">
                  close
                </span>
              </button>
              <Dialog.Title data-cy="modal-header" as="h1" className="text-xl text-center my-sm">
                {modalHeader}
              </Dialog.Title>

              <div data-cy="modal-body" className="flex flex-col justify-center my-md">
                {modalBody}
              </div>
              {error && (
                <div className="flex flex-col justify-center my-md">
                  <FormErrorMessage>Något gick fel.</FormErrorMessage>
                </div>
              )}
              <div className="flex flex-row justify-between my-sm">
                <Button
                  data-cy="verification-no"
                  className="w-64"
                  color="primary"
                  disabled={isLoading}
                  onClick={onCancel}
                >
                  Nej
                </Button>
                <Button
                  data-cy="verification-yes"
                  className="w-64"
                  variant="primary"
                  color="primary"
                  loadingText="Sparar"
                  loading={isLoading}
                  onClick={() => {
                    setIsLoading(true);
                    onContinue()
                      .then((res) => {
                        if (res) {
                          setIsLoading(false);
                          onClose();
                        }
                      })
                      .catch((e) => {
                        console.error('Error: action could not be completed.');
                        setError(true);
                        setIsLoading(false);
                        return false;
                      });
                  }}
                >
                  Ja
                </Button>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};
