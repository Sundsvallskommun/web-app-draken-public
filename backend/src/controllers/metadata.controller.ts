import { MUNICIPALITY_ID } from '@/config';
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

  @Get('/metadata/jsonschemas')
  @OpenAPI({ summary: 'List JSON schemas' })
  @UseBefore(authMiddleware)
  async listJsonSchemas(@Req() req: RequestWithUser): Promise<ResponseData<any>> {
    const url = `${this.PARTYASSETS_SERVICE}/${MUNICIPALITY_ID}/metadata/jsonschemas`;
    const res = await this.apiService.get<any>({ url }, req.user);
    return { data: res.data, message: 'success' };
  }

  @Get('/jsonschemas/:id')
  @OpenAPI({ summary: 'Get JSON schema by id' })
  @UseBefore(authMiddleware)
  async getJsonSchema(@Req() req: RequestWithUser, @Param('id') id: string): Promise<ResponseData<any>> {
    const url = `${this.PARTYASSETS_SERVICE}/${MUNICIPALITY_ID}/metadata/jsonschemas/${id}`;
    const res = await this.apiService.get<any>({ url }, req.user);
    return { data: res.data, message: 'success' };
  }

  @Get('/metadata/jsonschemas/:name/latest')
  @OpenAPI({ summary: 'Get lastest JSON schema by name' })
  @UseBefore(authMiddleware)
  async getLatestJsonSchema(@Req() req: RequestWithUser, @Param('name') name: string): Promise<ResponseData<any>> {
    const url = `${this.PARTYASSETS_SERVICE}/${MUNICIPALITY_ID}/metadata/jsonschemas/${name}/latest`;
    const res = await this.apiService.get<any>({ url }, req.user);
    return { data: res.data, message: 'success' };
  }
}
