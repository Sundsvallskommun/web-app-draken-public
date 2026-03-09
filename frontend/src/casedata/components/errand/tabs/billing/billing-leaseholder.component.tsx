import { Role } from '@casedata/interfaces/role';
import { getStakeholdersByRelation } from '@casedata/services/casedata-stakeholder-service';
import { useAppContext } from '@contexts/app.context';

export const BillingLeaseholder: React.FC = () => {
  const { errand } = useAppContext();

  if (!errand) {
    return <span className="italic">Arrendator saknas</span>;
  }

  const leaseholders = getStakeholdersByRelation(errand, Role.LEASEHOLDER);

  if (leaseholders.length > 0)
    return (
      <>
        {leaseholders.map((leaseholder, index) => {
          const isOrganization = !!leaseholder.organizationNumber || !!leaseholder.organizationName;
          const displayName = isOrganization
            ? leaseholder.organizationName
            : `${leaseholder.firstName || ''} ${leaseholder.lastName || ''}`.trim();
          const displayId = isOrganization ? leaseholder.organizationNumber : leaseholder.personalNumber;

          return (
            <div key={index}>
              <span>
                {displayName}
                {displayId && `, ${displayId}`}
              </span>
              <br />
              <span>
                {leaseholder.street}, {leaseholder.zip} {leaseholder.city}
              </span>
            </div>
          );
        })}
      </>
    );

  return <span className="italic">Arrendator saknas</span>;
};
