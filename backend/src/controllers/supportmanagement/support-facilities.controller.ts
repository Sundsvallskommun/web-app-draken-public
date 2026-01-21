import { SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { HttpException } from '@/exceptions/HttpException';
import { RequestWithUser } from '@/interfaces/auth.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import ApiService from '@/services/api.service';
import { logger } from '@/utils/logger';
import { apiURL } from '@/utils/util';
import { Body, Controller, Param, Patch, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

type Parameters = {
  key: string;
  displayName: string;
  values: string[];
}[];

interface FacilitiesPayload {
  propertyDesignations: string[];
  districtnames: string[];
}

@Controller()
export class SupportFacilitiesController {
  private apiService = new ApiService();
  private namespace = SUPPORTMANAGEMENT_NAMESPACE;
  SERVICE = apiServiceName('supportmanagement');

  @Patch('/supporterrands/saveFacilities/:municipalityId/:id')
  @OpenAPI({ summary: 'Save facilities by errand' })
  @UseBefore(authMiddleware)
  async saveFacility(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Param('id') id: string,
    @Body() facilities: FacilitiesPayload,
    @Res() response: any,
  ) {
    if (!municipalityId || !id) {
      throw new HttpException(400, 'Bad Request');
    }

    const PROPERTY_DESIGNATION_KEY = 'propertyDesignation';
    const PROPERTY_DESIGNATION_DISPLAY_NAME = 'Fastighetsbeteckning';
    const DISTRICT_NAME_KEY = 'districtname';
    const DISTRICT_NAME_DISPLAY_NAME = 'Distriktnamn';

    const supportErrandUrl = `${municipalityId}/${this.namespace}/errands/${id}/parameters`;
    const supportBaseURL = apiURL(this.SERVICE);
    const existingParametersResponse = await this.apiService.get<Parameters>({ url: supportErrandUrl, baseURL: supportBaseURL }, req.user);
    const existingParameters = existingParametersResponse?.data;
    if (!existingParameters) {
      logger.error('No parameters found for errand with id', id);
      return response.status(404).send('No parameters found for errand with id');
    }

    const filteredParameters = existingParameters.filter(p => p.key !== PROPERTY_DESIGNATION_KEY && p.key !== DISTRICT_NAME_KEY);

    const newParameters: Parameters = [
      ...filteredParameters,
      {
        key: PROPERTY_DESIGNATION_KEY,
        displayName: PROPERTY_DESIGNATION_DISPLAY_NAME,
        values: facilities.propertyDesignations || [],
      },
      {
        key: DISTRICT_NAME_KEY,
        displayName: DISTRICT_NAME_DISPLAY_NAME,
        values: facilities.districtnames || [],
      },
    ];

    const url = `${municipalityId}/${this.namespace}/errands/${id}/parameters`;
    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.patch<any, Parameters>({ url, baseURL, data: newParameters }, req.user).catch(e => {
      logger.error('Error when patching support errand');
      logger.error(e);
      throw e;
    });

    return response.status(200).send(res.data);
  }
}
