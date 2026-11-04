import { User } from '@interfaces/users.interface';
import { validate as isUuid } from 'uuid';

import { apiServiceName } from '@/config/api-config';
import { CitizenExtended } from '@/data-contracts/citizen/data-contracts';
import { PortalPersonData } from '@/data-contracts/employee/data-contracts';

import ApiService from './api.service';

export const UNKNOWN_PERSON_NAME = 'Okänd användare';

const toFullName = (person?: { givenname?: string | null; lastname?: string | null }): string =>
  [person?.givenname, person?.lastname].filter(Boolean).join(' ');

export class PersonNameService {
  private apiService = new ApiService();
  private CITIZEN_SERVICE = apiServiceName('citizen');
  private EMPLOYEE_SERVICE = apiServiceName('employee');

  /**
   * Finds the name behind an identifier that comes without a type: a UUID is the partyId of a citizen, anything else the
   * AD account of an employee. A failed lookup never stops the caller, and a partyId is never shown in place of a name.
   */
  async getNameByIdentifier(municipalityId: string, identifier: string, user: User): Promise<string> {
    return isUuid(identifier) ? this.getCitizenName(municipalityId, identifier, user) : this.getEmployeeName(municipalityId, identifier, user);
  }

  private async getCitizenName(municipalityId: string, partyId: string, user: User): Promise<string> {
    const url = `${this.CITIZEN_SERVICE}/${municipalityId}/${partyId}`;
    const name = await this.apiService
      .get<CitizenExtended>({ url }, user)
      .then(response => toFullName(response.data))
      .catch(() => '');
    return name || UNKNOWN_PERSON_NAME;
  }

  private async getEmployeeName(municipalityId: string, adAccount: string, user: User): Promise<string> {
    const url = `${this.EMPLOYEE_SERVICE}/${municipalityId}/portalpersondata/PERSONAL/${encodeURIComponent(adAccount)}`;
    const name = await this.apiService
      .get<PortalPersonData>({ url }, user)
      .then(response => toFullName(response.data))
      .catch(() => '');
    return name || adAccount;
  }
}
