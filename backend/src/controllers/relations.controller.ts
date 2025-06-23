import { Relation } from '@/data-contracts/relations/data-contracts';
import { RequestWithUser } from '@/interfaces/auth.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import ApiService from '@/services/api.service';
import { logger } from '@/utils/logger';
import { apiURL } from '@/utils/util';
import { Body, Controller, Delete, Get, HttpCode, Param, Post, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

@Controller()
export class RelationsController {
  private apiService = new ApiService();

  private SERVICE = `relations/1.0`;

  @Post('/:municipalityId/relations')
  @HttpCode(201)
  @OpenAPI({ summary: 'Create relation' })
  @UseBefore(authMiddleware)
  async createRelation(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Body() relationbody: Relation,
  ): Promise<{ data: any; message: string }> {
    const url = `${municipalityId}/relations`;
    const baseURL = apiURL(this.SERVICE);
    const response = await this.apiService.post<any, any>({ url, baseURL, data: relationbody }, req.user).catch(e => {
      console.log('Something went wrong when creating relation: ' + e);
      throw e;
    });
    return { data: response.data, message: `Relation created` };
  }

  @Delete('/:municipalityId/relations/:id')
  @HttpCode(201)
  @OpenAPI({ summary: 'Delete a relation' })
  @UseBefore(authMiddleware)
  async deleteRelation(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: number,
    @Param('id') id: string,
  ): Promise<{ data: boolean; message: string }> {
    const baseURL = apiURL(this.SERVICE);
    if (!id) {
      console.log('Id not found. Cannot delete relation without id.');
    }
    const url = `${municipalityId}/relations/${id}`;
    const response = await this.apiService.delete<boolean>({ url, baseURL }, req.user).catch(e => {
      throw e;
    });
    return { data: response.data, message: `Relation with id ${id} removed` };
  }

  @Get('/:municipalityId/relations')
  @OpenAPI({ summary: 'Find matching relations' })
  @UseBefore(authMiddleware)
  async getRelations(@Req() req: RequestWithUser, @Param('municipalityId') municipalityId: string): Promise<{ data: any; message: string }> {
    const url = `${municipalityId}/relations`;
    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.get<any>({ url, baseURL }, req.user).catch(e => {
      logger.error('Error when fetching relations: ', e);
      throw e;
    });
    return { data: res.data, message: 'success' };
  }
}
