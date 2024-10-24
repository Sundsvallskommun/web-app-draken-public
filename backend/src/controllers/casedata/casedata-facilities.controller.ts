import { FacilityDTO } from '@/data-contracts/case-data/data-contracts';
import { HttpException } from '@/exceptions/HttpException';
import { logger } from '@/utils/logger';
import { apiURL } from '@/utils/util';
import { RequestWithUser } from '@interfaces/auth.interface';
import authMiddleware from '@middlewares/auth.middleware';
import ApiService from '@services/api.service';
import { Body, Controller, Param, Post, Req, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

interface ResponseData {
  data: any;
  message: string;
}

@Controller()
export class caseDataFacilitiesController {
  private apiService = new ApiService();
  SERVICE = `case-data/8.0`;

  @Post('/casedata/:municipalityId/errande/:errandeId/facilities')
  @OpenAPI({ summary: 'Save facilities by errande' })
  @UseBefore(authMiddleware)
  async saveFacility(
    @Req() req: RequestWithUser,
    @Param('errandeId') errandeId: string,
    @Param('municipalityId') municipalityId: string,
    @Body() facilities: FacilityDTO[],
  ) {
    if (errandeId === undefined) {
      throw new HttpException(400, 'Bad Request');
    }

    const url = `${municipalityId}/errands/${errandeId}/facilities`;
    const baseURL = apiURL(this.SERVICE);
    const data = JSON.stringify(facilities);

    const response = await this.apiService
      .put<FacilityDTO, Partial<string>>({ url, baseURL, data: data }, req.user)
      .then(facilitiesResponse => {
        return facilitiesResponse.data;
      })
      .catch(e => {
        logger.error('Error when saving facilities');
        logger.error(e);
        throw e;
      });

    return { data: 'response', message: 'success' } as ResponseData;
  }
}