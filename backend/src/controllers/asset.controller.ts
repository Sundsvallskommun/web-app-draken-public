import { RequestWithUser } from '@interfaces/auth.interface';
import { Asset } from '@interfaces/parking-permit.interface';
import authMiddleware from '@middlewares/auth.middleware';
import ApiService from '@services/api.service';
import { Body, Controller, Get, Param, Patch, Post, QueryParam, Req, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

import { apiServiceName } from '@/config/api-config';
import {
  AssetCreateRequest,
  AssetUpdateRequest,
  DraftAssetUpdateRequest,
} from '@/data-contracts/partyassets/data-contracts';

interface ResponseData<T> {
  data: T;
  message: string;
}

@Controller()
export class AssetController {
  private apiService = new ApiService();
  PARTYASSETS_SERVICE = apiServiceName('partyassets');

  private buildAssetQuery(params: Record<string, string | undefined>): string {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v) qs.set(k, v);
    }
    const str = qs.toString();
    return str ? `?${str}` : '';
  }

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
    const query = this.buildAssetQuery({ partyId, type, status, origin, assetId, issued, validTo });
    const url = `${this.PARTYASSETS_SERVICE}/${municipalityId}/assets${query}`;
    const res = await this.apiService.get<Asset[]>({ url }, req.user);
    return { data: res.data, message: 'success' };
  }

  @Post('/assets')
  @OpenAPI({ summary: 'Create an asset' })
  @UseBefore(authMiddleware)
  async createAsset(
    @Req() req: RequestWithUser,
    @QueryParam('municipalityId') municipalityId?: string,
    @Body() body?: AssetCreateRequest,
  ): Promise<ResponseData<Asset>> {
    municipalityId ??= '2281';
    const url = `${this.PARTYASSETS_SERVICE}/${municipalityId}/assets`;
    const res = await this.apiService.post<any, any>({ url, data: body }, req.user);
    return { data: res.data, message: 'created' };
  }

  @Patch('/assets/:id')
  @OpenAPI({ summary: 'Update an asset (status and statusReason only)' })
  @UseBefore(authMiddleware)
  async patchAsset(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @QueryParam('municipalityId') municipalityId?: string,
    @Body() body?: AssetUpdateRequest,
  ): Promise<ResponseData<Asset>> {
    municipalityId ??= '2281';
    const url = `${this.PARTYASSETS_SERVICE}/${municipalityId}/assets/${encodeURIComponent(id)}`;
    const res = await this.apiService.patch<any, any>({ url, data: body }, req.user);
    return { data: res.data, message: 'updated' };
  }

  @Get('/asset-drafts')
  @OpenAPI({ summary: 'Returns draft assets' })
  @UseBefore(authMiddleware)
  async listDraftAssets(
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
    const query = this.buildAssetQuery({ partyId, type, status, origin, assetId, issued, validTo });
    const url = `${this.PARTYASSETS_SERVICE}/${municipalityId}/asset-drafts${query}`;
    const res = await this.apiService.get<Asset[]>({ url }, req.user);
    return { data: res.data, message: 'success' };
  }

  @Post('/asset-drafts')
  @OpenAPI({ summary: 'Create a draft asset' })
  @UseBefore(authMiddleware)
  async createDraftAsset(
    @Req() req: RequestWithUser,
    @QueryParam('municipalityId') municipalityId?: string,
    @Body() body?: AssetCreateRequest,
  ): Promise<ResponseData<Asset>> {
    municipalityId ??= '2281';
    const url = `${this.PARTYASSETS_SERVICE}/${municipalityId}/asset-drafts`;
    const res = await this.apiService.post<any, any>({ url, data: body }, req.user);
    return { data: res.data, message: 'created' };
  }

  @Patch('/asset-drafts/:id')
  @OpenAPI({ summary: 'Update a draft asset' })
  @UseBefore(authMiddleware)
  async patchDraftAsset(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @QueryParam('municipalityId') municipalityId?: string,
    @Body() body?: DraftAssetUpdateRequest,
  ): Promise<ResponseData<Asset>> {
    municipalityId ??= '2281';
    const url = `${this.PARTYASSETS_SERVICE}/${municipalityId}/asset-drafts/${encodeURIComponent(id)}`;
    const res = await this.apiService.patch<any, any>({ url, data: body }, req.user);
    return { data: res.data, message: 'updated' };
  }
}
