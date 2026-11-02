import { User } from '@interfaces/users.interface';

import { apiServiceName } from '@/config/api-config';
import { PersonGuidBatch } from '@/data-contracts/citizen/data-contracts';

import ApiService from './api.service';

export class CitizenService {
  private apiService = new ApiService();
  private CITIZEN_SERVICE = apiServiceName('citizen');

  /**
   * Returns the party id of the person with this personal number, or '' when there is none. Uses the
   * batch endpoint so the personal number travels in the request body: request URLs are logged.
   */
  async getPartyIdByPersonNumber(municipalityId: string, personNumber: string, user: User): Promise<string> {
    const url = `${this.CITIZEN_SERVICE}/${municipalityId}/guid/batch`;
    const response = await this.apiService.post<PersonGuidBatch[], string[]>({ url, data: [personNumber] }, user);
    return response.data?.find(result => result.success)?.personId ?? '';
  }
}
