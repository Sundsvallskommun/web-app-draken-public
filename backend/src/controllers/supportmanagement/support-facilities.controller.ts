import { SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { HttpException } from '@/exceptions/HttpException';
import { RequestWithUser } from '@/interfaces/auth.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import ApiService from '@/services/api.service';
import { logger } from '@/utils/logger';
import { apiURL } from '@/utils/util';
import { Body, Controller, Param, Patch, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';
import { SupportErrandDto } from './support-errand.controller';

type Parameters = {
  key: string;
  displayName: string;
  values: string[];
}[];

@Controller()
export class SupportFacilitiesController {
  private apiService = new ApiService();
  private namespace = SUPPORTMANAGEMENT_NAMESPACE;
  SERVICE = `supportmanagement/10.3`;

  @Patch('/supporterrands/saveFacilities/:municipalityId/:id')
  @OpenAPI({ summary: 'Save facilities by errand' })
  @UseBefore(authMiddleware)
  async saveFacility(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Param('id') id: string,
    @Body() facilities: string[],
    @Res() response: any,
  ) {
    if (!municipalityId || !id) {
      throw new HttpException(400, 'Bad Request');
    }

    const PROPERTY_DESIGNATION_KEY = 'propertyDesignation';
    const PROPERTY_DESIGNATION_DISPLAY_NAME = 'Fastighetsbeteckning';

    const supportErrandUrl = `${municipalityId}/${this.namespace}/errands/${id}/parameters`;
    const supportBaseURL = apiURL(this.SERVICE);
    const existingParametersResponse = await this.apiService.get<Parameters>({ url: supportErrandUrl, baseURL: supportBaseURL }, req.user);
    const existingParameters = existingParametersResponse?.data;
    if (!existingParameters) {
      logger.error('No parameters found for errand with id', id);
      return response.status(404).send('No parameters found for errand with id');
    }

    let url: string;
    let body: Parameters | string[] = [];
    if (existingParameters.find(p => p.key === PROPERTY_DESIGNATION_KEY)) {
      url = `${municipalityId}/${this.namespace}/errands/${id}/parameters/propertyDesignation`;
      body = facilities;
    } else {
      url = `${municipalityId}/${this.namespace}/errands/${id}/parameters`;
      body = [
        ...existingParameters,
        {
          key: PROPERTY_DESIGNATION_KEY,
          displayName: PROPERTY_DESIGNATION_DISPLAY_NAME,
          values: facilities,
        },
      ];
    }
    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.patch<any, Parameters | string[]>({ url, baseURL, data: body }, req.user).catch(e => {
      logger.error('Error when patching support errand');
      logger.error(e);
      throw e;
    });

    return response.status(200).send(res.data);
  }
}
