import { RequestWithUser } from '@interfaces/auth.interface';
import { Asset } from '@interfaces/parking-permit.interface';
import authMiddleware from '@middlewares/auth.middleware';
import ApiService from '@services/api.service';
import { Controller, Get, QueryParam, Req, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

interface ResponseData<T> {
  data: T;
  message: string;
}

@Controller()
export class AssetController {
  private apiService = new ApiService();

  @Get(`/assets`)
  @OpenAPI({ summary: 'Returns a persons assets' })
  @UseBefore(authMiddleware)
  async getMyGroups(
    @Req() req: RequestWithUser,
    @QueryParam('partyId') partyId: string,
    @QueryParam('type') type: string,
  ): Promise<ResponseData<Asset[]>> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const url = `/partyassets/3.0/2281/assets?partyId=${partyId}&type=${type}`;

    const res = await this.apiService.get<Asset[]>(
      {
        url,
      },
      req.user,
    );

    return { data: res.data, message: 'success' } as ResponseData<Asset[]>;
  }
}
