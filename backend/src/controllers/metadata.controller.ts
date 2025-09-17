import { apiServiceName } from '@/config/api-config';
import { RequestWithUser } from '@interfaces/auth.interface';
import authMiddleware from '@middlewares/auth.middleware';
import ApiService from '@services/api.service';
import { Controller, Get, Param, Req, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

interface ResponseData<T> {
  data: T;
  message: string;
}

@Controller()
export class MetadataController {
  private apiService = new ApiService();
  PARTYASSETS_SERVICE = apiServiceName('partyassets');

  @Get('/:municipalityId/metadata/jsonschemas')
  @OpenAPI({ summary: 'List JSON schemas' })
  @UseBefore(authMiddleware)
  async listJsonSchemas(@Req() req: RequestWithUser, @Param('municipalityId') municipalityId: string): Promise<ResponseData<any>> {
    const url = `${this.PARTYASSETS_SERVICE}/${municipalityId}/metadata/jsonschemas`;
    const res = await this.apiService.get<any>({ url }, req.user);
    return { data: res.data, message: 'success' };
  }

  @Get('/:municipalityId/metadata/jsonschemas/:id')
  @OpenAPI({ summary: 'Get JSON schema by id' })
  @UseBefore(authMiddleware)
  async getJsonSchema(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Param('id') id: string,
  ): Promise<ResponseData<any>> {
    const url = `${this.PARTYASSETS_SERVICE}/${municipalityId}/metadata/jsonschemas/${id}`;
    const res = await this.apiService.get<any>({ url }, req.user);
    return { data: res.data, message: 'success' };
  }
}
