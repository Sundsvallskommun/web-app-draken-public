import { HttpException } from '@exceptions/HttpException';
import { RequestWithUser } from '@interfaces/auth.interface';
import authMiddleware from '@middlewares/auth.middleware';
import { Controller, Get, Param, QueryParam, Req, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

import { Address, Addresses, AddressRestaurantNumber, Assignment } from '@/data-contracts/licensed-business/data-contracts';
import { LicensedBusinessService } from '@/services/licensed-business.service';

interface ResponseData<T> {
  data: T;
  message: string;
}

const requireText = (value: string | undefined, name: string): string => {
  const text = value?.trim();
  if (!text) {
    throw new HttpException(400, `${name} is required`);
  }
  return text;
};

/**
 * Read-only access to serveringsställen in LicensedBusiness. "Not found" on the lookup and assignment
 * endpoints is answered with `data: null`, so a caller can fall back without treating it as an error.
 */
@Controller()
export class LicensedBusinessController {
  private licensedBusinessService = new LicensedBusinessService();

  @Get('/:municipalityId/licensed-business/addresses/lookup')
  @OpenAPI({ summary: 'Look up the one address matching street address and postal code, null when there is none' })
  @UseBefore(authMiddleware)
  async lookupAddress(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @QueryParam('streetAddress') streetAddress: string,
    @QueryParam('postalCode') postalCode: string,
  ): Promise<ResponseData<Address | null>> {
    const data = await this.licensedBusinessService.lookupAddress(
      municipalityId,
      requireText(streetAddress, 'streetAddress'),
      requireText(postalCode, 'postalCode'),
      req.user,
    );
    return { data, message: 'success' };
  }

  @Get('/:municipalityId/licensed-business/addresses/search')
  @OpenAPI({ summary: 'Free-text search for addresses' })
  @UseBefore(authMiddleware)
  async searchAddresses(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @QueryParam('query') query: string,
    @QueryParam('page') page?: number,
    @QueryParam('limit') limit?: number,
  ): Promise<ResponseData<Addresses>> {
    const data = await this.licensedBusinessService.searchAddresses(municipalityId, requireText(query, 'query'), { page, limit }, req.user);
    return { data, message: 'success' };
  }

  @Get('/:municipalityId/licensed-business/addresses/:addressId/restaurant-numbers')
  @OpenAPI({ summary: 'Get every restaurant number at an address' })
  @UseBefore(authMiddleware)
  async getAddressRestaurantNumbers(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Param('addressId') addressId: string,
  ): Promise<ResponseData<AddressRestaurantNumber[]>> {
    const data = await this.licensedBusinessService.getAddressRestaurantNumbers(municipalityId, addressId, req.user);
    return { data, message: 'success' };
  }

  @Get('/:municipalityId/licensed-business/restaurant-numbers/:restaurantNumber/assignment')
  @OpenAPI({ summary: 'Get the most recent assignment of a restaurant number, null when it has never been assigned' })
  @UseBefore(authMiddleware)
  async getRestaurantNumberAssignment(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Param('restaurantNumber') restaurantNumber: string,
  ): Promise<ResponseData<Assignment | null>> {
    const data = await this.licensedBusinessService.getRestaurantNumberAssignment(municipalityId, restaurantNumber, req.user);
    return { data, message: 'success' };
  }
}
