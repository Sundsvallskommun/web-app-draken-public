import { BillingServiceItem } from '@casedata/interfaces/billing';
import { Button, Table } from '@sk-web-gui/react';
import { Pen, Trash2 } from 'lucide-react';
import { AddBillingService } from './add-billing-service.component';

interface BillingServiceTableProps {
  services: BillingServiceItem[];
  onRemoveService: (serviceId: string) => void;
  onEditService: (serviceId: string) => void;
  onSaveService: (service: BillingServiceItem) => void;
  onCancelEdit: () => void;
  editingServiceId: string | null;
}

export const BillingServiceTable: React.FC<BillingServiceTableProps> = ({
  services,
  onRemoveService,
  onEditService,
  onSaveService,
  onCancelEdit,
  editingServiceId,
}) => {
  return (
    <div className="flex flex-col">
      <Table dense>
        <Table.Header>
          <Table.HeaderColumn>Beskrivning</Table.HeaderColumn>
          <Table.HeaderColumn>Avitext</Table.HeaderColumn>
          <Table.HeaderColumn>Antal</Table.HeaderColumn>
          <Table.HeaderColumn>Pris</Table.HeaderColumn>
          <Table.HeaderColumn>Summa</Table.HeaderColumn>
          <Table.HeaderColumn></Table.HeaderColumn>
          <Table.HeaderColumn></Table.HeaderColumn>
        </Table.Header>
        <Table.Body>
          {services.map((service) => {
            if (editingServiceId === service.id) {
              return (
                <tr key={service.id}>
                  <td colSpan={9} className="p-0">
                    <AddBillingService onSave={onSaveService} onCancel={onCancelEdit} editingService={service} />
                  </td>
                </tr>
              );
            }

            return (
              <Table.Row key={service.id}>
                <Table.Column className="!overflow-visible">
                  <div className="relative pt-16 pb-30">
                    <span className="font-bold">{service.name}</span>
                    <span className="text-small whitespace-nowrap absolute left-0 bottom-8">
                      Ansvar: {service.accountInformation.costCenter || '-'}, Underkonto:{' '}
                      {service.accountInformation.subaccount || '-'}, Verksamhet:{' '}
                      {service.accountInformation.department || '-'}, Aktivitet:{' '}
                      {service.accountInformation.activity || '-'}, Projekt: {service.accountInformation.project || '-'}
                      , Objekt: {service.accountInformation.object || '-'}
                    </span>
                  </div>
                </Table.Column>
                <Table.Column className="max-w-[14rem] whitespace-normal">
                  {' '}
                  <div className="relative pt-16 pb-30">{service.avitext || '-'} </div>
                </Table.Column>
                <Table.Column>
                  {' '}
                  <div className="relative pt-16 pb-30">{service.quantity}</div>
                </Table.Column>
                <Table.Column>
                  {' '}
                  <div className="relative pt-16 pb-30">{service.costPerUnit.toFixed(2)} kr</div>
                </Table.Column>
                <Table.Column>
                  {' '}
                  <div className="relative pt-16 pb-30">{service.totalAmount.toFixed(2)} kr</div>
                </Table.Column>
                <Table.Column>
                  <div className="relative pt-16 pb-30">
                    <Button
                      size="sm"
                      variant="tertiary"
                      iconButton
                      onClick={() => onEditService(service.id)}
                      disabled={editingServiceId !== null}
                    >
                      <Pen size={16} />
                    </Button>
                  </div>
                </Table.Column>
                <Table.Column>
                  <div className="relative pt-16 pb-30">
                    <Button
                      size="sm"
                      inverted
                      iconButton
                      color="error"
                      onClick={() => onRemoveService(service.id)}
                      disabled={editingServiceId !== null}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </Table.Column>
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table>
    </div>
  );
};
