import { BillingServiceItem } from '@casedata/interfaces/billing';
import { Button, Table } from '@sk-web-gui/react';
import { Pen, Trash2 } from 'lucide-react';
import { FC } from 'react';

import { AddBillingService } from './add-billing-service.component';

interface BillingServiceTableProps {
  services: BillingServiceItem[];
  onRemoveService: (serviceId: string) => void;
  onEditService: (serviceId: string) => void;
  onSaveService: (service: BillingServiceItem) => void;
  onCancelEdit: () => void;
  editingServiceId: string | null;
}

export const BillingServiceTable: FC<BillingServiceTableProps> = ({
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
          <Table.HeaderColumn>Antal</Table.HeaderColumn>
          <Table.HeaderColumn>Pris</Table.HeaderColumn>
          <Table.HeaderColumn>Summa</Table.HeaderColumn>
          <Table.HeaderColumn></Table.HeaderColumn>
          <Table.HeaderColumn></Table.HeaderColumn>
        </Table.Header>
        {services.map((service) => {
          if (editingServiceId === service.id) {
            return (
              <tbody key={service.id}>
                <tr>
                  <td colSpan={6} className="p-0">
                    <AddBillingService onSave={onSaveService} onCancel={onCancelEdit} editingService={service} />
                  </td>
                </tr>
              </tbody>
            );
          }

          return (
            <tbody key={service.id}>
              <Table.Row className="!border-b-0">
                <Table.Column className="!items-start">
                  <div className="flex flex-col w-[36rem]">
                    <span className="font-bold mt-6">{service.name}</span>
                    {service.descriptions?.some((d) => d) && (
                      <div className="py-4">
                        {service.descriptions
                          .filter((d) => d)
                          .map((desc, i) => (
                            <span key={i} className="text-small text-dark-secondary block">
                              {desc}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                </Table.Column>
                <Table.Column className="-mr-18 !items-start">
                  <span className="mt-6">{service.quantity}</span>
                </Table.Column>
                <Table.Column className="-mr-18 !items-start">
                  <span className="whitespace-nowrap mt-6">{service.costPerUnit.toFixed(2)} kr</span>
                </Table.Column>
                <Table.Column className="-mr-18 !items-start">
                  <span className="whitespace-nowrap mt-6">{service.totalAmount.toFixed(2)} kr</span>
                </Table.Column>
                <Table.Column className="max-w-[3rem]">
                  <div className="mt-6">
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
                <Table.Column className="max-w-[3rem] mr-10">
                  <div className="mt-6">
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
              <tr className="border-b-1 border-divider">
                <td colSpan={6} className="pl-16 pb-8 pt-2">
                  <span className="text-small text-dark-secondary italic">
                    Ansvar: {service.accountInformation.costCenter || '-'}, Underkonto:{' '}
                    {service.accountInformation.subaccount || '-'}, Verksamhet:{' '}
                    {service.accountInformation.department || '-'}, Aktivitet:{' '}
                    {service.accountInformation.activity || '-'}, Projekt: {service.accountInformation.project || '-'},
                    Objekt: {service.accountInformation.object || '-'}
                  </span>
                </td>
              </tr>
            </tbody>
          );
        })}
      </Table>
    </div>
  );
};
