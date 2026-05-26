import { HttpException } from '@exceptions/HttpException';
import { RequestWithUser } from '@interfaces/auth.interface';
import authMiddleware from '@middlewares/auth.middleware';
import ApiService from '@services/api.service';
import {
  createErrandAssetRelation,
  deleteErrandAssetRelationsForAsset,
  findAssetIdsForErrand,
  findSourceErrandIdForAsset,
  findSourceErrandsForAssets,
} from '@services/asset-relations.service';
import { fetchErrandNumberById, fetchErrandNumbersByIds } from '@services/errand-lookup.service';
import { logger } from '@utils/logger';
import { Body, Controller, Delete, Get, Param, Patch, Post, QueryParam, Req, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

import { apiServiceName } from '@/config/api-config';
import { Asset, AssetCreateRequest, AssetUpdateRequest, DraftAssetUpdateRequest, Status } from '@/data-contracts/partyassets/data-contracts';
import { apiURL } from '@/utils/util';

interface ResponseData<T> {
  data: T;
  message: string;
}

type EnrichedAsset = Asset & {
  sourceErrandId?: string;
  sourceErrandNumber?: string;
};

@Controller()
export class AssetController {
  private readonly apiService = new ApiService();
  private readonly PARTYASSETS_SERVICE = apiServiceName('partyassets');

  private buildAssetQuery(params: Record<string, string | undefined>): string {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) qs.set(key, value);
    }
    const str = qs.toString();
    return str ? `?${str}` : '';
  }

  private async fetchUpstreamAssets(
    user: RequestWithUser['user'],
    municipalityId: string,
    path: 'assets' | 'asset-drafts',
    params: Record<string, string | undefined>,
  ): Promise<Asset[]> {
    const url = `${this.PARTYASSETS_SERVICE}/${municipalityId}/${path}${this.buildAssetQuery(params)}`;
    const res = await this.apiService.get<Asset[]>({ url }, user);
    return res.data ?? [];
  }

  // The upstream partyassets API does NOT expose a DELETE for drafts — `DELETE /asset-drafts/{id}`
  // returns 405 Method Not Allowed. Drafts and actives share the same id space, so every deletion
  // (active, draft, and create-rollback) is routed through the `/assets/{id}` endpoint instead.
  private async deleteUpstreamAsset(user: RequestWithUser['user'], municipalityId: string, assetId: string): Promise<void> {
    const url = `${this.PARTYASSETS_SERVICE}/${municipalityId}/assets/${encodeURIComponent(assetId)}`;
    await this.apiService.delete({ url }, user);
  }

  private async cleanupErrandAssetRelations(municipalityId: string, assetId: string, user: RequestWithUser['user']): Promise<void> {
    try {
      await deleteErrandAssetRelationsForAsset(municipalityId, assetId, user);
    } catch (e) {
      logger.error(`Asset ${assetId} was deleted, but errand→asset relation cleanup failed: `, e);
    }
  }

  private async createAssetForPath(
    req: RequestWithUser,
    path: 'assets' | 'asset-drafts',
    municipalityId: string,
    errandId: string | undefined,
    body?: AssetCreateRequest,
  ): Promise<EnrichedAsset> {
    const baseURL = apiURL(this.PARTYASSETS_SERVICE);
    const url = `${municipalityId}/${path}`;
    const res = await this.apiService.post<Asset, AssetCreateRequest>({ url, baseURL, data: body }, req.user);
    const createdId = res.data?.id;

    if (!createdId) {
      throw new HttpException(502, 'Created asset id missing');
    }

    if (errandId) {
      try {
        await createErrandAssetRelation(municipalityId, errandId, createdId, req.user);
      } catch (e) {
        try {
          await this.deleteUpstreamAsset(req.user, municipalityId, createdId);
        } catch (rollbackError) {
          logger.error(`Failed to rollback created ${path} asset ${createdId} after relation creation failed: `, rollbackError);
        }
        throw e;
      }
    }

    return { ...res.data, sourceErrandId: errandId };
  }

  private async enrichWithErrandNumbers(user: RequestWithUser['user'], municipalityId: string, assets: EnrichedAsset[]): Promise<EnrichedAsset[]> {
    const errandIds = assets.map(a => a.sourceErrandId).filter((id): id is string => !!id);
    if (errandIds.length === 0) return assets;
    const numbers = await fetchErrandNumbersByIds(municipalityId, errandIds, user);
    return assets.map(asset => ({
      ...asset,
      sourceErrandNumber: asset.sourceErrandId ? numbers.get(asset.sourceErrandId) : undefined,
    }));
  }

  private async listAssetsForPath(
    req: RequestWithUser,
    path: 'assets' | 'asset-drafts',
    municipalityId: string,
    upstreamParams: Record<string, string | undefined>,
    errandId?: string,
  ): Promise<EnrichedAsset[]> {
    const assets = await this.fetchUpstreamAssets(req.user, municipalityId, path, upstreamParams);
    if (assets.length === 0) return [];

    if (errandId) {
      const [errandAssetIds, errandNumber] = await Promise.all([
        findAssetIdsForErrand(municipalityId, errandId, req.user),
        fetchErrandNumberById(municipalityId, errandId, req.user),
      ]);
      return assets
        .filter(asset => asset.id && errandAssetIds.has(asset.id))
        .map(asset => ({ ...asset, sourceErrandId: errandId, sourceErrandNumber: errandNumber }));
    }

    const sourceErrandIdByAssetId = await findSourceErrandsForAssets(
      municipalityId,
      assets.map(asset => asset.id).filter((id): id is string => !!id),
      req.user,
    );
    const enriched: EnrichedAsset[] = assets.map(asset => ({
      ...asset,
      sourceErrandId: asset.id ? sourceErrandIdByAssetId.get(asset.id) : undefined,
    }));
    return this.enrichWithErrandNumbers(req.user, municipalityId, enriched);
  }

  @Get('/errand-services')
  @OpenAPI({ summary: 'Returns drafts + actives linked to an errand via relations, deduped and enriched' })
  @UseBefore(authMiddleware)
  async listErrandServices(
    @Req() req: RequestWithUser,
    @QueryParam('municipalityId') municipalityId?: string,
    @QueryParam('errandId') errandId?: string,
    @QueryParam('partyId') partyId?: string,
    @QueryParam('type') type?: string,
    @QueryParam('origin') origin?: string,
  ): Promise<ResponseData<EnrichedAsset[]>> {
    municipalityId ??= '2281';
    if (!errandId || !partyId) return { data: [], message: 'success' };

    const upstreamParams = { partyId, type, origin };
    const [drafts, actives] = await Promise.all([
      this.listAssetsForPath(req, 'asset-drafts', municipalityId, upstreamParams, errandId),
      this.listAssetsForPath(req, 'assets', municipalityId, upstreamParams, errandId),
    ]);
    const draftIds = new Set(drafts.map(d => d.id));
    return {
      data: [...drafts, ...actives.filter(a => !draftIds.has(a.id))],
      message: 'success',
    };
  }

  @Get('/party-services')
  @OpenAPI({ summary: "Returns a person's non-DRAFT assets, enriched with source errand" })
  @UseBefore(authMiddleware)
  async listPartyServices(
    @Req() req: RequestWithUser,
    @QueryParam('municipalityId') municipalityId?: string,
    @QueryParam('partyId') partyId?: string,
    @QueryParam('type') type?: string,
    @QueryParam('origin') origin?: string,
  ): Promise<ResponseData<EnrichedAsset[]>> {
    municipalityId ??= '2281';
    if (!partyId) return { data: [], message: 'success' };

    const actives = await this.listAssetsForPath(req, 'assets', municipalityId, { partyId, type, origin });
    return {
      data: actives.filter(a => a.status !== Status.DRAFT),
      message: 'success',
    };
  }

  @Get('/assets')
  @OpenAPI({ summary: 'Returns a persons assets, optionally narrowed to a single errand via relations' })
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
    @QueryParam('errandId') errandId?: string,
  ): Promise<ResponseData<EnrichedAsset[]>> {
    municipalityId ??= '2281';
    const data = await this.listAssetsForPath(req, 'assets', municipalityId, { partyId, type, status, origin, assetId, issued, validTo }, errandId);
    return { data, message: 'success' };
  }

  @Get('/assets/:id')
  @OpenAPI({ summary: 'Get a single asset by id, enriched with source errand when available' })
  @UseBefore(authMiddleware)
  async getAsset(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @QueryParam('municipalityId') municipalityId?: string,
  ): Promise<ResponseData<EnrichedAsset>> {
    municipalityId ??= '2281';
    const url = `${this.PARTYASSETS_SERVICE}/${municipalityId}/assets/${encodeURIComponent(id)}`;
    const res = await this.apiService.get<Asset>({ url }, req.user);
    try {
      const sourceErrandId = await findSourceErrandIdForAsset(municipalityId, id, req.user);
      const sourceErrandNumber = sourceErrandId ? await fetchErrandNumberById(municipalityId, sourceErrandId, req.user) : undefined;
      return { data: { ...res.data, sourceErrandId, sourceErrandNumber }, message: 'success' };
    } catch (e) {
      logger.error(`Asset ${id} was fetched, but source errand enrichment failed: `, e);
      return { data: res.data, message: 'success' };
    }
  }

  @Post('/assets')
  @OpenAPI({ summary: 'Create an asset and, when errandId is supplied, link it to the errand via relations' })
  @UseBefore(authMiddleware)
  async createAsset(
    @Req() req: RequestWithUser,
    @QueryParam('municipalityId') municipalityId?: string,
    @QueryParam('errandId') errandId?: string,
    @Body() body?: AssetCreateRequest,
  ): Promise<ResponseData<EnrichedAsset>> {
    municipalityId ??= '2281';
    const data = await this.createAssetForPath(req, 'assets', municipalityId, errandId, body);
    return { data, message: 'created' };
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
    const res = await this.apiService.patch<Asset, AssetUpdateRequest>({ url, data: body }, req.user);
    return { data: res.data, message: 'updated' };
  }

  @Delete('/assets/:id')
  @OpenAPI({ summary: 'Delete an asset and any errand link relations' })
  @UseBefore(authMiddleware)
  async deleteAsset(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @QueryParam('municipalityId') municipalityId?: string,
  ): Promise<ResponseData<boolean>> {
    municipalityId ??= '2281';
    await this.deleteUpstreamAsset(req.user, municipalityId, id);
    await this.cleanupErrandAssetRelations(municipalityId, id, req.user);
    return { data: true, message: 'deleted' };
  }

  @Get('/asset-drafts')
  @OpenAPI({ summary: 'Returns draft assets, optionally narrowed to a single errand via relations' })
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
    @QueryParam('errandId') errandId?: string,
  ): Promise<ResponseData<EnrichedAsset[]>> {
    municipalityId ??= '2281';
    const data = await this.listAssetsForPath(
      req,
      'asset-drafts',
      municipalityId,
      { partyId, type, status, origin, assetId, issued, validTo },
      errandId,
    );
    return { data, message: 'success' };
  }

  @Post('/asset-drafts')
  @OpenAPI({ summary: 'Create a draft asset and, when errandId is supplied, link it to the errand via relations' })
  @UseBefore(authMiddleware)
  async createDraftAsset(
    @Req() req: RequestWithUser,
    @QueryParam('municipalityId') municipalityId?: string,
    @QueryParam('errandId') errandId?: string,
    @Body() body?: AssetCreateRequest,
  ): Promise<ResponseData<EnrichedAsset>> {
    municipalityId ??= '2281';
    const data = await this.createAssetForPath(req, 'asset-drafts', municipalityId, errandId, body);
    return { data, message: 'created' };
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
    const res = await this.apiService.patch<Asset, DraftAssetUpdateRequest>({ url, data: body }, req.user);
    return { data: res.data, message: 'updated' };
  }

  @Delete('/asset-drafts/:id')
  @OpenAPI({ summary: 'Delete a draft asset and any errand link relations' })
  @UseBefore(authMiddleware)
  async deleteDraftAsset(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @QueryParam('municipalityId') municipalityId?: string,
  ): Promise<ResponseData<boolean>> {
    municipalityId ??= '2281';
    // Drafts have no upstream DELETE of their own; deletion goes via the shared assets endpoint.
    await this.deleteUpstreamAsset(req.user, municipalityId, id);
    await this.cleanupErrandAssetRelations(municipalityId, id, req.user);
    return { data: true, message: 'deleted' };
  }
}
