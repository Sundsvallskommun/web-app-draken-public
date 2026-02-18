import { BillingServiceItem } from '@casedata/interfaces/billing';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, Table } from '@sk-web-gui/react';
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
                  <div className="relative pt-24 pb-24">
                    <span className="font-bold">{service.name}</span>
                    <span className="text-small whitespace-nowrap absolute left-0 bottom-1">
                      Ansvar: {service.accountInformation.costCenter || '-'}, Underkonto:{' '}
                      {service.accountInformation.subaccount || '-'}, Verksamhet:{' '}
                      {service.accountInformation.department || '-'}, Aktivitet:{' '}
                      {service.accountInformation.activity || '-'}, Projekt: {service.accountInformation.project || '-'}
                      , Objekt: {service.accountInformation.object || '-'}
                    </span>
                  </div>
                </Table.Column>
                <Table.Column className="max-w-[14rem] whitespace-normal">{service.avitext || '-'}</Table.Column>
                <Table.Column>{service.quantity}</Table.Column>
                <Table.Column>{service.costPerUnit.toFixed(2)} kr</Table.Column>
                <Table.Column>{service.totalAmount.toFixed(2)} kr</Table.Column>
                <Table.Column>
                  <Button
                    size="sm"
                    variant="tertiary"
                    iconButton
                    onClick={() => onEditService(service.id)}
                    disabled={editingServiceId !== null}
                  >
                    <LucideIcon name="pen" size={16} />
                  </Button>
                </Table.Column>
                <Table.Column>
                  <Button
                    size="sm"
                    inverted
                    iconButton
                    color="error"
                    onClick={() => onRemoveService(service.id)}
                    disabled={editingServiceId !== null}
                  >
                    <LucideIcon name="trash-2" size={16} />
                  </Button>
                </Table.Column>
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table>
    </div>
  );
};
