import { User } from '@interfaces/users.interface';

import { apiServiceName } from '@/config/api-config';
import { LegalEntity2, OrganizationEngagements } from '@/data-contracts/legalentity/data-contracts';
import { formatOrgNr, OrgNumberFormat } from '@/utils/util';

import ApiService from './api.service';

export class OrganizationService {
  private apiService = new ApiService();
  private LEGALENTITY_SERVICE = apiServiceName('legalentity');
  private PARTY_SERVICE = apiServiceName('party');

  async getOrganizationByPartyId(municipalityId: string, partyId: string, user: User): Promise<LegalEntity2> {
    const url = `${this.LEGALENTITY_SERVICE}/${municipalityId}/${partyId}`;
    const response = await this.apiService.get<LegalEntity2>({ url }, user);
    return response.data;
  }

  async getOrganizationNumberByPartyId(municipalityId: string, partyId: string, user: User): Promise<string> {
    const organization = await this.getOrganizationByPartyId(municipalityId, partyId, user);
    return organization.organizationNumber ?? '';
  }

  async getOrganizationEngagements(municipalityId: string, partyId: string, user: User): Promise<OrganizationEngagements> {
    const organizationNumber = await this.getOrganizationNumberByPartyId(municipalityId, partyId, user);
    if (!organizationNumber) {
      return { engagements: [] };
    }

    const url = `${this.LEGALENTITY_SERVICE}/${municipalityId}/engagements/organization/${formatOrgNr(organizationNumber, OrgNumberFormat.NODASH)}`;
    const response = await this.apiService.get<OrganizationEngagements>({ url }, user);
    return response.data;
  }

  async getPartyIdByOrganizationNumber(municipalityId: string, organizationNumber: string, user: User): Promise<string> {
    const formattedOrganizationNumber = formatOrgNr(organizationNumber, OrgNumberFormat.NODASH);
    if (!formattedOrganizationNumber || Number(formattedOrganizationNumber[2]) <= 1) {
      return '';
    }

    const url = `${this.PARTY_SERVICE}/${municipalityId}/ENTERPRISE/${formattedOrganizationNumber}/partyId`;
    const response = await this.apiService.get<string>({ url }, user);
    return response.data;
  }
}
