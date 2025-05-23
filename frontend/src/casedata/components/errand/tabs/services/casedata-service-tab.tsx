import { RichTextEditor } from '@common/components/rich-text-editor/rich-text-editor.component';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { FormControl, FormLabel, Button, Select, RadioButton, Checkbox, DatePicker, Combobox } from '@sk-web-gui/react';
import { useRef, useState } from 'react';
import { ServiceListComponent } from './casedata-service-list.component';
import { serviceAddons, serviceAids, serviceModeOfTransportation, serviceTravelTypes } from './service';

export const CasedataServicesTab: React.FC = () => {
  const [serviceText, setServiceText] = useState('');
  const [services, setServices] = useState<any[]>([]);

  const [selectedRestyp, setSelectedRestyp] = useState('');
  const [selectedTransport, setSelectedTransport] = useState('');
  const [selectedAids, setSelectedAids] = useState<string[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [validityType, setValidityType] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const quillRef = useRef(null);

  const onRichTextChange = (val) => {
    setServiceText(val);
  };

  const handleAddService = () => {
    setHasAttemptedSubmit(true);

    const newErrors: Record<string, string> = {};

    if (!selectedRestyp) newErrors.restyp = 'Restyp måste anges.';
    if (!selectedTransport) newErrors.transport = 'Färdsätt måste anges.';
    if (!startDate) newErrors.startDate = 'Startdatum måste anges.';
    if (validityType !== 'tillsvidare' && !endDate) {
      newErrors.endDate = 'Slutdatum måste anges.';
    } else if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      newErrors.endDate = 'Slutdatum kan inte vara före startdatum.';
    }

    setFormErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setHasAttemptedSubmit(true);
      return;
    }

    const newService = {
      restyp: selectedRestyp,
      transport: selectedTransport,
      aids: selectedAids,
      addon: selectedAddons,
      comment: serviceText,
      startDate,
      endDate,
      validityType,
    };

    setServices((prev) => [...prev, newService]);

    setServiceText('');
    setSelectedRestyp('');
    setSelectedTransport('');
    setSelectedAids([]);
    setSelectedAddons([]);
    setStartDate('');
    setEndDate('');
    setValidityType('');
    setHasAttemptedSubmit(false);
    setFormErrors({});
  };

  const handleRemoveService = (id: number) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
  };

  const handleOrderService = (id: number) => {
    console.log('Beställ insats med id:', id);
  };

  return (
    <div className="w-full py-24 px-32">
      <h2 className="text-h4-sm md:text-h4-md">Insatser</h2>
      <p className="mt-sm text-md">
        Här specificeras vilka insatser som omfattas av färdtjänstbeslutet, samt eventuella tilläggstjänster och den
        service kunden har rätt till vid sina resor.
      </p>

      <div className="mt-24 grid grid-cols-1 md:grid-cols-2 gap-md">
        <FormControl className="w-full">
          <FormLabel>Restyp</FormLabel>
          <Select
            value={selectedRestyp}
            onChange={(e) => setSelectedRestyp(e.currentTarget.value)}
            placeholder="Välj restyp"
            size="md"
            className="w-full max-w-[44.6rem]"
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

        <FormControl className="w-full">
          <FormLabel>Färdsätt</FormLabel>
          <Select
            value={selectedTransport}
            onChange={(e) => setSelectedTransport(e.currentTarget.value)}
            placeholder="Välj färdsätt"
            size="md"
            className="w-full max-w-[44.6rem]"
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
          <Combobox
            multiple
            value={selectedAids}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedAids(Array.isArray(value) ? value : [value]);
            }}
          >
            <Combobox.Input placeholder="Välj hjälpmedel" className="w-full w-max-[44.6rem]" />
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
            onChange={(e) => {
              const value = e.target.value;
              setSelectedAddons(Array.isArray(value) ? value : [value]);
            }}
          >
            <Combobox.Input placeholder="Välj tillägg" className="w-full w-max-[44.6rem]" />
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
            onChange={() => setValidityType('tidsbegransad')}
            defaultChecked={true}
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
            className="w-full w-max-[44.6rem]"
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
        <RichTextEditor
          ref={quillRef}
          value={serviceText}
          onChange={onRichTextChange}
          isMaximizable={false}
          containerLabel="service"
        />
      </div>

      <div className="mt-24 pt-24">
        <Button leftIcon={<LucideIcon name="plus" />} variant="primary" size="md" onClick={handleAddService}>
          Lägg till insats
        </Button>
      </div>

      <div className="mt-32 pt-24">
        <h4 className="text-h6 mb-sm border-b ">Här listas de insatser som fattats kring ärendet</h4>
        <ServiceListComponent services={services} onRemove={handleRemoveService} onOrder={handleOrderService} />
      </div>
    </div>
  );
};
