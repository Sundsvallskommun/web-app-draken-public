import { EstateInformation } from '@common/interfaces/estate-details';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, Header, Table, Tabs, cx } from '@sk-web-gui/react';

export const FacilityDetails: React.FC<{
  show: boolean;
  label: string;
  closeHandler: () => void;
  estate: EstateInformation;
}> = ({ show, label = '', closeHandler, estate }) => {
  const getEstateChanges = (inObjectId) => {
    const ownerChanges = estate?.ownerChanges.find((owner) =>
      owner.acquisition.find((acquisition) => acquisition.registeredOwnership === inObjectId)
    );
    const owner = ownerChanges.acquisition.find((owner) => owner.registeredOwnership === inObjectId);
    const price = ownerChanges.purchasePrice.purchasePriceImmovableProperty?.sum;
    const purchasePriceType = ownerChanges.purchasePrice.purchasePriceType;
    return (
      <>
        <div className="flex gap-40 mb-16">
          <div>
            <div className="text-label-small mb-4">Andel</div>
            <div className="text-small" data-cy="owner-share">
              {owner.share}
            </div>
          </div>
          <div>
            <div className="text-label-small mb-4">Inskrivningsdag</div>
            <div className="text-small" data-cy="owner-enrollment">
              {owner.enrollmentDay}
            </div>
          </div>
          <div>
            <div className="text-label-small mb-4">Akt</div>
            <div className="text-small" data-cy="owner-filenumber">
              {owner.fileNumber}
            </div>
          </div>
        </div>

        <div className="text-label-small mb-8" data-cy="estate-changes">
          Fastighetsförändringar
        </div>

        <div className="border rounded px-16 py-8 bg-background-100">
          <div className="flex flex-wrap gap-16">
            <div>
              <div className="text-label-small mb-4">Köp</div>
              <div className="text-small">{owner.acquisitionDay}</div>
            </div>
            <div>
              <div className="text-label-small mb-4">Andel</div>
              <div className="text-small">{owner.share}</div>
            </div>
            <div>
              <div className="text-label-small mb-4">Köpeskilling</div>
              <div className="text-small">
                {price}, {purchasePriceType}
              </div>
            </div>
            <div>
              <div className="text-label-small mb-4">Inskrivningsdag</div>
              <div className="text-small">{owner.acquisitionDay}</div>
            </div>
            <div>
              <div className="text-label-small mb-4">Akt</div>
              <div className="text-small">{owner.fileNumber}</div>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <>
      <div className={cx(show ? 'sk-modal-wrapper' : 'fixed')}></div>
      <section
        className={cx(
          `border-1 border-t-0 absolute right-0 bottom-0 top-0 bg-background-content transition-all ease-in-out duration-150 overflow-auto z-[20]`,
          show ? 'w-full md:min-w-[50rem] md:w-[50vw] lg:w-[38vw]' : 'w-0 px-0'
        )}
      >
        <Header className="h-[64px] flex justify-between" wrapperClasses="py-4 px-40">
          <div className="text-h4-sm flex items-center gap-12">
            <LucideIcon name="mail" /> {label}
          </div>
          <Button
            tabIndex={show ? 0 : -1}
            aria-label="Stäng meddelande"
            iconButton
            variant="tertiary"
            onClick={() => {
              closeHandler();
            }}
            data-cy="close-estate-info-button"
          >
            <LucideIcon name="x" />
          </Button>
        </Header>

        <div className="m-32">
          <h2 className="text-h4-md mb-16 mx-8" data-cy="estate-designation">
            {estate?.designation}
          </h2>
          <Tabs tabslistClassName="ml-12 pt-14">
            <Tabs.Item>
              <Tabs.Button className="text-small" data-cy="ownership-tab">
                Ägande
              </Tabs.Button>
              <Tabs.Content>
                {estate?.ownership.map((ownership, index) => (
                  <div className="border rounded mb-16" key={`estateInfo-${index}`}>
                    <div className="px-16 py-8 bg-vattjom-background-200 text-label-small rounded-t">
                      {ownership.type}
                    </div>
                    <div className="p-16">
                      <div>
                        <div className="mb-16">
                          <div className="text-label-small mb-4">Ägare</div>
                          <div className="text-small" data-cy="owner-name">
                            {ownership.owner.name}
                          </div>
                          <div className="text-small" data-cy="owner-address">
                            {ownership.owner.address}
                          </div>
                          <div className="text-small" data-cy="owner-postal-and-city">
                            {ownership.owner.postalCode.slice(0, 3)} {ownership.owner.postalCode.slice(3, 5)}{' '}
                            {ownership.owner.city}
                          </div>
                        </div>
                        {getEstateChanges(ownership.objectidentifier)}
                      </div>
                    </div>
                  </div>
                ))}
              </Tabs.Content>
            </Tabs.Item>
            <Tabs.Item>
              <Tabs.Button data-cy="area-and-actions-tab">Area och åtgärder</Tabs.Button>
              <Tabs.Content>
                <>
                  <div className="border rounded mb-16">
                    <div className="px-16 py-8 bg-vattjom-background-200 text-label-small rounded-t">Area</div>
                    <div className="flex flex-wrap gap-16 p-16">
                      <div>
                        <div className="text-label-small mb-4">Totalarea</div>
                        <div className="text-small" data-cy="total-area">
                          {estate?.totalArea} kvm
                        </div>
                      </div>
                      <div>
                        <div className="text-label-small mb-4">Därav landarea</div>
                        <div className="text-small mt-4" data-cy="total-area-land">
                          {estate?.totalAreaLand} kvm
                        </div>
                      </div>
                      <div>
                        <div className="text-label-small mb-4">Därav vattenarea</div>
                        <div className="text-small" data-cy="total-area-water">
                          {estate?.totalAreaWater} kvm
                        </div>
                      </div>
                    </div>
                  </div>

                  <Table background={true} data-cy="action-table">
                    <Table.Header>
                      <Table.HeaderColumn>Åtgärder</Table.HeaderColumn>
                      <Table.HeaderColumn>Datum</Table.HeaderColumn>
                      <Table.HeaderColumn>Akt</Table.HeaderColumn>
                    </Table.Header>
                    <Table.Body>
                      {estate?.actions.map((action, id) => (
                        <Table.Row key={`atgarder-${id}`}>
                          <Table.Column data-cy="action-type">
                            <strong>{action.actionType1}</strong>
                          </Table.Column>
                          <Table.Column data-cy="action-date">{action.actionDate}</Table.Column>
                          <Table.Column data-cy="action-file-designation">{action.fileDesignation}</Table.Column>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table>
                </>
              </Tabs.Content>
            </Tabs.Item>
            {/* <Tabs.Item>
            <Tabs.Button>Inteckning</Tabs.Button>
            <Tabs.Content>
              <div className="border rounded mb-16">
                <div className="px-16 py-8 bg-vattjom-background-200 text-label-small">Inteckning</div>
                <div className="p-16">
                  <div>
                    <div className="mb-16">
                      <div className="text-label-small mb-4">Ägare</div>
                      <div className="text-small"></div>
                      <div className="text-small">adress</div>
                      <div className="text-small">post</div>
                    </div>

                  </div>
                </div>
              </div>
            </Tabs.Content>
          </Tabs.Item> */}
            {/* <Tabs.Item>
            <Tabs.Button>Rättigheter</Tabs.Button>
            <Tabs.Content>
              <p>Tokyo is the capital of Japan.</p>
            </Tabs.Content>
          </Tabs.Item>
          <Tabs.Item>
            <Tabs.Button>Planer</Tabs.Button>
            <Tabs.Content>
              <p>Tokyo is the capital of Japan.</p>
            </Tabs.Content>
          </Tabs.Item> */}
          </Tabs>
        </div>
      </section>
    </>
  );
};
