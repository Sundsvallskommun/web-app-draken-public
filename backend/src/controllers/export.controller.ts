import { RequestWithUser } from '@/interfaces/auth.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import ApiService from '@/services/api.service';
import { Body, Controller, Param, Post, QueryParam, Req, Res, UseBefore } from 'routing-controllers';
import { Errand } from '@/data-contracts/case-data/data-contracts';
import { OpenAPI } from 'routing-controllers-openapi';

/**
 * Preparation for errand list export
 */

@Controller()
export class ExportController {
  private apiService = new ApiService();
  private SERVICE = `endpoint/1.0`;

  @Post('/:municipalityId/export')
  @OpenAPI({ summary: 'Export list of errands' })
  @UseBefore(authMiddleware)
  async exportErrands(
    @Req() req: RequestWithUser,
    @Body() data: Errand[],
    @Param('municipalityId') municipalityId: string,
    @QueryParam('exclude') exclude: string,
    @Res() response: string,
  ): Promise<any> {
    console.log('exclude: ', exclude);
    console.log('errands: ', data);
    return true;
  }
}
