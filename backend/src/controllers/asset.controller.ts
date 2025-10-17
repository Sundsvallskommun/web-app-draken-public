import { apiServiceName } from '@/config/api-config';
import { CreateAssetDto, PatchAssetDto } from '@/dtos/assets-dto';
import { RequestWithUser } from '@interfaces/auth.interface';
import { Asset } from '@interfaces/parking-permit.interface';
import authMiddleware from '@middlewares/auth.middleware';
import ApiService from '@services/api.service';
import { Body, Controller, Get, Param, Patch, Post, QueryParam, Req, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

interface ResponseData<T> {
  data: T;
  message: string;
}

@Controller()
export class AssetController {
  private apiService = new ApiService();
  PARTYASSETS_SERVICE = apiServiceName('partyassets');

  @Get('/assets')
  @OpenAPI({ summary: 'Returns a persons assets' })
  @UseBefore(authMiddleware)
  async listAssets(
    @Req() req: RequestWithUser,
    @QueryParam('municipalityId') municipalityId?: string,
    @QueryParam('partyId') partyId?: string,
    @QueryParam('type') type?: string,
    @QueryParam('status') status?: string,
    @QueryParam('origin') origin?: string,
    @QueryParam('assetId') assetId?: string,
    @QueryParam('issued') issued?: string,
    @QueryParam('validTo') validTo?: string,
  ): Promise<ResponseData<Asset[]>> {
    municipalityId ??= '2281';
    const params = new URLSearchParams();
    if (partyId) params.set('partyId', partyId);
    if (type) params.set('type', type);
    if (status) params.set('status', status);
    if (origin) params.set('origin', origin);
    if (assetId) params.set('assetId', assetId);
    if (issued) params.set('issued', issued);
    if (validTo) params.set('validTo', validTo);

    const url = `${this.PARTYASSETS_SERVICE}/${municipalityId}/assets${params.toString() ? `?${params}` : ''}`;
    const res = await this.apiService.get<Asset[]>({ url }, req.user);
    return { data: res.data, message: 'success' };
  }

  @Post('/assets')
  @OpenAPI({ summary: 'Create an asset' })
  @UseBefore(authMiddleware)
  async createAsset(
    @Req() req: RequestWithUser,
    @QueryParam('municipalityId') municipalityId?: string,
    @Body() body?: CreateAssetDto,
  ): Promise<ResponseData<Asset>> {
    municipalityId ??= '2281';
    const url = `${this.PARTYASSETS_SERVICE}/${municipalityId}/assets`;
    const res = await this.apiService.post<any, any>({ url, data: body }, req.user);
    return { data: res.data, message: 'created' };
  }

  @Patch('/assets/:id')
  @OpenAPI({ summary: 'Update an asset' })
  @UseBefore(authMiddleware)
  async patchAsset(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @QueryParam('municipalityId') municipalityId?: string,
    @Body() body?: PatchAssetDto,
  ): Promise<ResponseData<Asset>> {
    municipalityId ??= '2281';
    const url = `${this.PARTYASSETS_SERVICE}/${municipalityId}/assets/${encodeURIComponent(id)}`;
    const res = await this.apiService.patch<any, any>({ url, data: body }, req.user);
    return { data: res.data, message: 'updated' };
  }
}
