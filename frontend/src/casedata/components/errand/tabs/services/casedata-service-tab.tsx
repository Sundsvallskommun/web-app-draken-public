'use client';

import { isErrandLocked, isFTNationalErrand } from '@casedata/services/casedata-errand-service';
import {
  createErrandServiceDraftAsset,
  deleteErrandServiceDraftAsset,
  getErrandServiceAssetById,
  updateErrandServiceAsset,
} from '@casedata/services/casedata-service-assets-service';
import { getOwnerStakeholder } from '@casedata/services/casedata-stakeholder-service';
import { ServicesObjectFieldTemplate } from '@common/components/json/fields/services-object-field-template.componant';
import SchemaForm from '@common/components/json/schema/schema-form.component';
import { getLatestRjsfSchema, getRjsfSchema, getUiSchemaForSchema } from '@common/components/json/utils/schema-utils';
import { getToastOptions } from '@common/utils/toast-message-settings';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';
import {
  DatePicker,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Modal,
  RadioButton,
  useSnackbar,
} from '@sk-web-gui/react';
import { useCasedataStore, useConfigStore } from '@stores/index';
import { ChangeEvent, FC, useCallback, useEffect, useMemo, useState } from 'react';

import { ServiceListComponent } from './casedata-service-list.component';
import { useErrandServices, usePartyServices } from './useErrandService';

export const CasedataServicesTab: FC = () => {
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const errand = useCasedataStore((s) => s.errand);
  const [schema, setSchema] = useState<RJSFSchema | null>(null);
  const [uiSchema, setUiSchema] = useState<UiSchema | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [editSchema, setEditSchema] = useState<RJSFSchema | null>(null);
  const [editUiSchema, setEditUiSchema] = useState<UiSchema | null>(null);
  const [editSchemaId, setEditSchemaId] = useState<string>('');
  const [editStartDate, setEditStartDate] = useState<string>('');
  const [editEndDate, setEditEndDate] = useState<string>('');
  const [editValidityType, setEditValidityType] = useState<'tillsvidare' | 'tidsbegränsat'>('tillsvidare');
  const [schemaId, setSchemaId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [validityType, setValidityType] = useState<'tillsvidare' | 'tidsbegränsat'>('tillsvidare');
  const [dateErrors, setDateErrors] = useState<{ startDate?: string; endDate?: string }>({});
  const [editDateErrors, setEditDateErrors] = useState<{ startDate?: string; endDate?: string }>({});
  const toast = useSnackbar();

  const assetType = errand && isFTNationalErrand(errand) ? 'ParatransitPermitNational' : 'ParatransitPermitLocal';
  const errandId = String(errand?.id ?? '');
  const partyId = errand ? getOwnerStakeholder(errand)?.personId ?? '' : '';
  const serviceAssetParams = useMemo(
    () => ({ municipalityId, partyId, errandId, assetType }),
    [municipalityId, partyId, errandId, assetType]
  );

  useEffect(() => {
    (async () => {
      const { schema, schemaId } = await getLatestRjsfSchema(municipalityId, assetType);
      setSchema(schema);
      setSchemaId(schemaId);
      const fetchedUiSchema = await getUiSchemaForSchema(municipalityId, schemaId);
      setUiSchema(fetchedUiSchema);
    })();
  }, [municipalityId, assetType]);

  const { services, loading, error, refetch } = useErrandServices({
    municipalityId,
    partyId,
    errandId,
    assetType,
    schema,
  });

  const errandCasedataServices = useMemo(() => services.filter((s) => s.origin === 'CASEDATA'), [services]);
  const errandCasedataIds = useMemo(() => errandCasedataServices.map((s) => s.id), [errandCasedataServices]);
  const {
    services: partyServices,
    loading: partyLoading,
    error: partyError,
  } = usePartyServices({
    municipalityId,
    partyId,
    assetType,
    schema,
    excludeIds: errandCasedataIds,
  });

  const fetchAsset = useCallback(
    async (assetId: string) => {
      return getErrandServiceAssetById(serviceAssetParams, assetId);
    },
    [serviceAssetParams]
  );

  const removeService = useCallback(
    async (assetId: string) => {
      try {
        const removed = await deleteErrandServiceDraftAsset(serviceAssetParams, assetId);
        if (!removed) {
          await refetch();
          toast(getToastOptions({ message: 'Insatsen finns inte längre. Listan har uppdaterats.', status: 'info' }));
          return;
        }
        await refetch();
        toast(getToastOptions({ message: 'Insatsen togs bort.', status: 'success' }));
      } catch (e: any) {
        toast(
          getToastOptions({ message: e?.message ?? 'Något gick fel när insatsen skulle tas bort.', status: 'error' })
        );
      }
    },
    [serviceAssetParams, refetch, toast]
  );

  const handleSubmit = useCallback(
    async (payload: any) => {
      if (!schema || !municipalityId || !schemaId || !errand) return;
      const errors: { startDate?: string; endDate?: string } = {};
      if (!startDate) errors.startDate = 'Startdatum krävs';
      if (validityType === 'tidsbegränsat') {
        if (!endDate) errors.endDate = 'Slutdatum krävs';
        else if (endDate <= startDate) errors.endDate = 'Slutdatum måste vara efter startdatum';
      }
      setDateErrors(errors);
      if (Object.keys(errors).length > 0) return;
      const enrichedPayload = {
        ...payload,
        validFrom: startDate,
        validTo: validityType === 'tidsbegränsat' ? endDate || undefined : undefined,
        validityType,
      };
      try {
        await createErrandServiceDraftAsset(serviceAssetParams, enrichedPayload, schema, schemaId);
        toast(getToastOptions({ message: 'Ny insats tillagd.', status: 'success' }));
        await refetch();
        setFormData({});
        setStartDate('');
        setEndDate('');
        setValidityType('tillsvidare');
        setDateErrors({});
      } catch (e: any) {
        toast(
          getToastOptions({ message: e?.message ?? 'Något gick fel när insatsen skulle sparas.', status: 'error' })
        );
      }
    },
    [schema, municipalityId, schemaId, errand, serviceAssetParams, startDate, endDate, validityType, refetch, toast]
  );

  const startEdit = useCallback(
    async (assetId: string) => {
      try {
        const asset = await fetchAsset(assetId);
        if (!asset) {
          toast(getToastOptions({ message: 'Kunde inte hitta insatsen.', status: 'error' }));
          return;
        }
        const param = asset.jsonParameters?.[0];
        let value: unknown = param?.value;
        if (typeof value === 'string') {
          try {
            value = JSON.parse(value);
          } catch {
            // keep as-is
          }
        }
        const storedSchemaId = param?.schemaId;
        if (storedSchemaId) {
          const fetchedSchema = await getRjsfSchema(municipalityId, storedSchemaId);
          const fetchedUiSchema = await getUiSchemaForSchema(municipalityId, storedSchemaId);
          setEditSchema(fetchedSchema);
          setEditUiSchema(fetchedUiSchema);
          setEditSchemaId(storedSchemaId);
        } else {
          setEditSchema(schema);
          setEditUiSchema(uiSchema);
          setEditSchemaId(schemaId);
        }
        setEditStartDate(asset.issued ?? '');
        setEditEndDate(asset.validTo ?? '');
        setEditValidityType(asset.validTo ? 'tidsbegränsat' : 'tillsvidare');
        setEditFormData(value);
        setEditingId(assetId);
      } catch {
        toast(getToastOptions({ message: 'Kunde inte hämta insatsdata.', status: 'error' }));
      }
    },
    [fetchAsset, municipalityId, schema, schemaId, uiSchema, toast]
  );

  const closeEditModal = useCallback(() => {
    setEditingId(null);
    setEditFormData(null);
    setEditSchema(null);
    setEditUiSchema(null);
    setEditSchemaId('');
    setEditStartDate('');
    setEditEndDate('');
    setEditValidityType('tillsvidare');
    setEditDateErrors({});
  }, []);

  const handleEditSubmit = useCallback(
    async (payload: any) => {
      if (!editingId || !editSchemaId) return;
      const errors: { startDate?: string; endDate?: string } = {};
      if (!editStartDate) errors.startDate = 'Startdatum krävs';
      if (editValidityType === 'tidsbegränsat') {
        if (!editEndDate) errors.endDate = 'Slutdatum krävs';
        else if (editEndDate <= editStartDate) errors.endDate = 'Slutdatum måste vara efter startdatum';
      }
      setEditDateErrors(errors);
      if (Object.keys(errors).length > 0) return;
      const { validFrom: _vf, validTo: _vt, validityType: _vty, ...jsonValue } = payload ?? {};
      try {
        const tillsvidare = editValidityType === 'tillsvidare';
        const { draftedActiveAsset } = await updateErrandServiceAsset(serviceAssetParams, editingId, {
          issued: editStartDate,
          validTo: tillsvidare ? undefined : editEndDate,
          indefinitely: tillsvidare,
          jsonParameters: [{ key: assetType, value: jsonValue, schemaId: editSchemaId }],
        });
        await refetch();
        closeEditModal();
        toast(
          getToastOptions({
            message: draftedActiveAsset ? 'Insatsen flyttades till utkast och uppdaterades.' : 'Insatsen uppdaterades.',
            status: 'success',
          })
        );
      } catch (e: any) {
        toast(
          getToastOptions({ message: e?.message ?? 'Något gick fel när insatsen skulle uppdateras.', status: 'error' })
        );
      }
    },
    [
      editingId,
      editSchemaId,
      editStartDate,
      editEndDate,
      editValidityType,
      assetType,
      serviceAssetParams,
      refetch,
      closeEditModal,
      toast,
    ]
  );

  return (
    <div className="w-full max-w-full py-24 px-32 overflow-x-hidden">
      <h2 className="text-h4-sm md:text-h4-md">Insatser</h2>
      <p className="mt-sm text-md">
        Här specificeras vilka insatser som omfattas av färdtjänstbeslutet, samt eventuella tilläggstjänster och den
        service kunden har rätt till vid sina resor.
      </p>

      {!(errand ? isErrandLocked(errand) : false) && (
        <div className="mt-24 max-w-full">
          {uiSchema && (
            <SchemaForm
              schema={schema!}
              uiSchema={uiSchema}
              formData={formData}
              onChange={(fd) => setFormData(fd)}
              onSubmit={handleSubmit}
              objectFieldTemplate={ServicesObjectFieldTemplate}
              extraContent={
                <div className="flex flex-col gap-16 mt-16">
                  <FormControl>
                    <FormLabel>Giltighet</FormLabel>
                    <div className="flex gap-16">
                      <RadioButton
                        name="validityType"
                        value="tillsvidare"
                        checked={validityType === 'tillsvidare'}
                        onChange={() => {
                          setValidityType('tillsvidare');
                          setEndDate('');
                        }}
                      >
                        Tillsvidare
                      </RadioButton>
                      <RadioButton
                        name="validityType"
                        value="tidsbegränsat"
                        checked={validityType === 'tidsbegränsat'}
                        onChange={() => setValidityType('tidsbegränsat')}
                      >
                        Tidsbegränsat
                      </RadioButton>
                    </div>
                  </FormControl>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-[2.4rem] w-full">
                    <FormControl className="form-row w-full max-w-[48rem]" invalid={!!dateErrors.startDate}>
                      <FormLabel>Startdatum *</FormLabel>
                      <DatePicker
                        value={startDate}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          setStartDate(e.target.value);
                          setDateErrors((p) => ({ ...p, startDate: undefined }));
                        }}
                      />
                      {dateErrors.startDate && <FormErrorMessage>{dateErrors.startDate}</FormErrorMessage>}
                    </FormControl>
                    <FormControl className="form-row w-full max-w-[48rem]" invalid={!!dateErrors.endDate}>
                      <FormLabel>Slutdatum {validityType === 'tidsbegränsat' ? '*' : ''}</FormLabel>
                      <DatePicker
                        value={endDate}
                        disabled={validityType === 'tillsvidare'}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          setEndDate(e.target.value);
                          setDateErrors((p) => ({ ...p, endDate: undefined }));
                        }}
                      />
                      {dateErrors.endDate && <FormErrorMessage>{dateErrors.endDate}</FormErrorMessage>}
                    </FormControl>
                  </div>
                </div>
              }
            />
          )}
        </div>
      )}

      <div className="mt-32 pt-24">
        <h4 className="text-h6 mb-sm border-b">Här listas de insatser som fattats kring ärendet</h4>
        {loading ? (
          <div>Hämtar insatser…</div>
        ) : error ? (
          <div className="text-error">{error}</div>
        ) : (
          <ServiceListComponent
            services={errandCasedataServices}
            onRemove={removeService}
            onEdit={startEdit}
            readOnly={errand ? isErrandLocked(errand) : false}
          />
        )}
      </div>

      <div className="mt-32 pt-24">
        <h4 className="text-h6 mb-sm border-b">Personens övriga insatser</h4>
        {partyLoading ? (
          <div>Hämtar personens insatser…</div>
        ) : partyError ? (
          <div className="text-error">{partyError}</div>
        ) : (
          <ServiceListComponent services={partyServices} readOnly emptyMessage="Personen har inga övriga insatser" />
        )}
      </div>

      <Modal show={editingId !== null} className="w-[80rem]" onClose={closeEditModal} label="Redigera insats">
        <Modal.Content>
          {editFormData && editUiSchema && editSchema && (
            <SchemaForm
              schema={editSchema}
              uiSchema={editUiSchema}
              formData={editFormData}
              onChange={(fd) => setEditFormData(fd)}
              onSubmit={handleEditSubmit}
              objectFieldTemplate={ServicesObjectFieldTemplate}
              submitButtonOptions={{ label: 'Spara', leadingIcon: false }}
              extraContent={
                <div className="flex flex-col gap-16 mt-16">
                  <FormControl>
                    <FormLabel>Giltighet</FormLabel>
                    <div className="flex gap-16">
                      <RadioButton
                        name="editValidityType"
                        value="tillsvidare"
                        checked={editValidityType === 'tillsvidare'}
                        onChange={() => {
                          setEditValidityType('tillsvidare');
                          setEditEndDate('');
                        }}
                      >
                        Tillsvidare
                      </RadioButton>
                      <RadioButton
                        name="editValidityType"
                        value="tidsbegränsat"
                        checked={editValidityType === 'tidsbegränsat'}
                        onChange={() => setEditValidityType('tidsbegränsat')}
                      >
                        Tidsbegränsat
                      </RadioButton>
                    </div>
                  </FormControl>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-[2.4rem] w-full">
                    <FormControl className="form-row w-full max-w-[48rem]" invalid={!!editDateErrors.startDate}>
                      <FormLabel>Startdatum *</FormLabel>
                      <DatePicker
                        value={editStartDate}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          setEditStartDate(e.target.value);
                          setEditDateErrors((p) => ({ ...p, startDate: undefined }));
                        }}
                      />
                      {editDateErrors.startDate && <FormErrorMessage>{editDateErrors.startDate}</FormErrorMessage>}
                    </FormControl>
                    <FormControl className="form-row w-full max-w-[48rem]" invalid={!!editDateErrors.endDate}>
                      <FormLabel>Slutdatum {editValidityType === 'tidsbegränsat' ? '*' : ''}</FormLabel>
                      <DatePicker
                        value={editEndDate}
                        disabled={editValidityType === 'tillsvidare'}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          setEditEndDate(e.target.value);
                          setEditDateErrors((p) => ({ ...p, endDate: undefined }));
                        }}
                      />
                      {editDateErrors.endDate && <FormErrorMessage>{editDateErrors.endDate}</FormErrorMessage>}
                    </FormControl>
                  </div>
                </div>
              }
            />
          )}
        </Modal.Content>
      </Modal>
    </div>
  );
};
