import { MEXRelation, PTRelation, Role } from '@casedata/interfaces/role';
import { CasedataOwnerOrContact } from '@casedata/interfaces/stakeholder';
import { isMEX, isPT } from '@common/services/application-service';
import { FormControl, FormErrorMessage, FormLabel, Select, cx } from '@sk-web-gui/react';
import { FieldErrors, UseFormRegister } from 'react-hook-form';

export const ContactRelationSelect: React.FC<{
  contact: CasedataOwnerOrContact;
  register: UseFormRegister<CasedataOwnerOrContact>;
  errors: FieldErrors<CasedataOwnerOrContact>;
  disabled?: boolean;
  className?: string;
}> = ({ contact, register, errors, disabled, className }) => {
  return (
    <FormControl id={`contact-relation`} size="sm" className={className}>
      <FormLabel>Roll</FormLabel>
      <Select
        data-cy={`roll-select`}
        disabled={disabled}
        {...register(`relation`)}
        className={cx(errors?.relation ? 'border-2 border-error' : 'w-full')}
      >
        <Select.Option key="" value="">
          Välj roll
        </Select.Option>
        {Object.entries(isMEX ? MEXRelation : isPT ? PTRelation : [])
          .filter(([key]) => {
            if (key === Role.APPLICANT && contact.roles.includes(Role.CONTACT_PERSON)) {
              return false;
            }
            if (key === Role.CONTACT_PERSON && contact.roles.includes(Role.APPLICANT)) {
              return false;
            }
            return true;
          })
          .sort((a, b) => (a[1] > b[1] ? 1 : -1))
          .map(([key, relation]) => (
            <Select.Option key={key} value={key}>
              {relation}
            </Select.Option>
          ))}
      </Select>
      {errors && errors.relation && (
        <div className="my-sm text-error">
          <FormErrorMessage>{errors.relation?.message}</FormErrorMessage>
        </div>
      )}
    </FormControl>
  );
};
