import { useEffect, useRef, useState } from 'react';
import { FormControl, FormLabel, Select, Combobox, RadioButton, Checkbox, DatePicker, Button } from '@sk-web-gui/react';
import LucideIcon from '@sk-web-gui/lucide-icon';
import dynamic from 'next/dynamic';
import { v4 as uuidv4 } from 'uuid';
import { serviceTravelTypes, serviceModeOfTransportation, serviceAids, serviceAddons } from './service';
import { Service } from './casedata-service-item.component';
const TextEditor = dynamic(() => import('@sk-web-gui/text-editor'), { ssr: false });
interface Props {
  initialService?: Service;
  onSubmit: (service: Service) => void;
  onCancel: () => void;
}

export const CasedataServiceForm: React.FC<Props> = ({ initialService, onSubmit, onCancel }) => {
  const [serviceText, setServiceText] = useState('');
  const [selectedRestyp, setSelectedRestyp] = useState('');
  const [selectedTransport, setSelectedTransport] = useState('');
  const [selectedAids, setSelectedAids] = useState<string[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [validityType, setValidityType] = useState<'tidsbegransad' | 'tillsvidare'>('tidsbegransad');
  const [searchValueAddons, setSearchValueAddons] = useState('');
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const quillRef = useRef(null);

  useEffect(() => {
    if (initialService) {
      setTimeout(() => {
        setServiceText(initialService.comment);
        setSelectedRestyp(initialService.restyp);
        setSelectedTransport(initialService.transport);
        setSelectedAids(initialService.aids);
        setSelectedAddons(initialService.addon);
        setStartDate(initialService.startDate);
        setEndDate(initialService.endDate);
        setValidityType(initialService.validityType);
      }, 0);
    }
  }, [initialService]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!selectedRestyp) newErrors.restyp = 'Restyp måste anges.';
    if (!selectedTransport) newErrors.transport = 'Färdsätt måste anges.';
    if (!startDate) newErrors.startDate = 'Startdatum måste anges.';
    if (validityType !== 'tillsvidare' && !endDate) {
      newErrors.endDate = 'Slutdatum måste anges.';
    } else if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      newErrors.endDate = 'Slutdatum kan inte vara före startdatum.';
    }
    return newErrors;
  };

  const resetForm = () => {
    setServiceText('');
    setSelectedRestyp('');
    setSelectedTransport('');
    setSelectedAids([]);
    setSelectedAddons([]);
    setStartDate('');
    setEndDate('');
    setValidityType('tidsbegransad');
    setFormErrors({});
    setHasAttemptedSubmit(false);
  };

  const handleSubmit = () => {
    setHasAttemptedSubmit(true);
    const errors = validate();
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) return;

    const service: Service = {
      id: initialService?.id ?? uuidv4(),
      restyp: selectedRestyp,
      transport: selectedTransport,
      aids: selectedAids,
      addon: selectedAddons,
      comment: serviceText,
      startDate,
      endDate,
      validityType,
    };

    onSubmit(service);
    if (!initialService) {
      resetForm();
    }
  };

  const handleComboboxChange =
    (setter: React.Dispatch<React.SetStateAction<string[]>>) => (event: { target: { value: string | string[] } }) => {
      const value = event.target.value;
      setter(Array.isArray(value) ? value : [value]);
    };

  return (
    <div className="w-full py-24 px-32">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
        <FormControl className="w-full max-w-[44.6rem]">
          <FormLabel>Restyp</FormLabel>
          <Select
            value={selectedRestyp}
            onChange={(e) => setSelectedRestyp(e.currentTarget.value)}
            placeholder="Välj restyp"
            size="md"
            className="w-full"
            invalid={hasAttemptedSubmit && selectedRestyp === ''}
          >
            <Select.Option value="" disabled hidden>
              Välj restyp
            </Select.Option>
            {serviceTravelTypes.map((typ) => (
              <Select.Option key={typ.value} value={typ.label}>
                {typ.label}
              </Select.Option>
            ))}
          </Select>
          {formErrors.restyp && <div className="text-error text-md">{formErrors.restyp}</div>}
        </FormControl>

        <FormControl className="w-full max-w-[44.6rem]">
          <FormLabel>Färdsätt</FormLabel>
          <Select
            value={selectedTransport}
            onChange={(e) => setSelectedTransport(e.currentTarget.value)}
            placeholder="Välj färdsätt"
            size="md"
            className="w-full"
            invalid={hasAttemptedSubmit && selectedTransport === ''}
          >
            <Select.Option value="" disabled hidden>
              Välj färdsätt
            </Select.Option>
            {serviceModeOfTransportation.map((typ) => (
              <Select.Option key={typ.value} value={typ.label}>
                {typ.label}
              </Select.Option>
            ))}
          </Select>
          {formErrors.transport && <div className="text-error text-md">{formErrors.transport}</div>}
        </FormControl>

        <FormControl className="w-full max-w-[44.6rem]">
          <FormLabel>Hjälpmedel</FormLabel>
          <Combobox multiple value={selectedAids} onChange={handleComboboxChange(setSelectedAids)}>
            <Combobox.Input placeholder="Välj hjälpmedel" className="w-full" />
            <Combobox.List>
              {serviceAids.map((typ) => (
                <Combobox.Option key={typ.value} value={typ.label}>
                  {typ.label}
                </Combobox.Option>
              ))}
            </Combobox.List>
          </Combobox>
        </FormControl>

        <FormControl className="w-full max-w-[44.6rem]">
          <FormLabel>Tillägg</FormLabel>
          <Combobox
            multiple
            value={selectedAddons}
            onChange={handleComboboxChange(setSelectedAddons)}
            searchValue={searchValueAddons}
            onChangeSearch={(event) => setSearchValueAddons(event.target.value)}
          >
            <Combobox.Input placeholder="Välj tillägg" className="w-full" />
            <Combobox.List>
              {serviceAddons.map((typ) => (
                <Combobox.Option key={typ.value} value={typ.label}>
                  {typ.label}
                </Combobox.Option>
              ))}
            </Combobox.List>
          </Combobox>
        </FormControl>
      </div>

      <FormControl className="mt-24">
        <FormLabel>Giltighetstid</FormLabel>
        <div className="flex flex-row flex-wrap items-center gap-12">
          <RadioButton
            name="validity"
            value="tidsbegransad"
            checked={validityType === 'tidsbegransad'}
            onChange={() => setValidityType('tidsbegransad')}
          >
            Tidsbegränsat
          </RadioButton>

          <RadioButton
            name="validity"
            value="tillsvidare"
            checked={validityType === 'tillsvidare'}
            onChange={() => {
              setValidityType('tillsvidare');
              setEndDate('');
            }}
          >
            Tillsvidare
          </RadioButton>

          <Checkbox name="vinterfardtjanst" value="true" size="md">
            Vinterfärdtjänst
          </Checkbox>
        </div>
      </FormControl>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-md mt-24">
        <FormControl className="w-full max-w-[44.6rem]">
          <FormLabel>Startdatum</FormLabel>
          <DatePicker
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            aria-label="Startdatum"
            type="date"
            size="md"
            name="startDate"
            className="w-full"
            invalid={hasAttemptedSubmit && !startDate}
          />
          {formErrors.startDate && <div className="text-error text-md">{formErrors.startDate}</div>}
        </FormControl>

        <FormControl className="w-full max-w-[44.6rem]">
          <FormLabel>Slutdatum</FormLabel>
          <DatePicker
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            aria-label="Slutdatum"
            type="date"
            size="md"
            name="endDate"
            className="w-full"
            disabled={validityType === 'tillsvidare'}
            invalid={
              hasAttemptedSubmit &&
              ((validityType !== 'tillsvidare' && !endDate) ||
                (startDate && endDate && new Date(endDate) < new Date(startDate)))
            }
          />
          {formErrors.endDate && <div className="text-error text-md">{formErrors.endDate}</div>}
        </FormControl>
      </div>

      <div className="mt-24 h-[19rem]">
        <TextEditor
          className="mb-md h-[80%]"
          ref={quillRef}
          defaultValue={serviceText}
          onTextChange={(_delta, _oldDelta, source) => {
            if (quillRef.current) {
              const html = quillRef.current.root.innerHTML;
              setServiceText(html);
            }
          }}
        />
      </div>
      <div className="mt-24 pt-24">
        <Button leftIcon={<LucideIcon name="check" />} variant="primary" size="md" onClick={handleSubmit}>
          {initialService ? 'Spara ändringar' : 'Lägg till insats'}
        </Button>

        <Button variant="ghost" size="md" className="ml-md" onClick={onCancel}>
          Avbryt
        </Button>
      </div>
    </div>
  );
};
