import { HttpException } from '@/exceptions/HttpException';
import { EstateInfoSearch, EstateInformation } from '@/interfaces/estate-info.interface';
import { RequestWithUser } from '@interfaces/auth.interface';
import authMiddleware from '@middlewares/auth.middleware';
import ApiService from '@services/api.service';
import { Controller, Get, Param, Req, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

interface ResponseData {
  data: any;
  message: string;
}

@Controller()
export class EstateInfoController {
  private apiService = new ApiService();

  @Get('/estateByPropertyDesignation/:query')
  @OpenAPI({ summary: 'Fetch info for estate by address' })
  @UseBefore(authMiddleware)
  async fetchEstateByPropertyDesignation(@Req() req: RequestWithUser, @Param('query') query: string) {
    if (query.length < 2) {
      throw new HttpException(400, 'Bad Request');
    }

    const url = `estateinfo/2.0/${process.env.MUNICIPALITY_ID}/estate-by-designation`;
    const res = await this.apiService.get<EstateInfoSearch[]>({ url, params: { designation: query, maxHits: 10 } }, req.user);
    return { data: res.data, message: 'success' } as ResponseData;
  }

  @Get('/estateByAddress/:query')
  @OpenAPI({ summary: 'Fetch info for estate by address' })
  @UseBefore(authMiddleware)
  async fetchEstateByAddress(@Req() req: RequestWithUser, @Param('query') query: string) {
    if (query.length < 2) {
      throw new HttpException(400, 'Bad Request');
    }

    const url = `estateinfo/2.0/${process.env.MUNICIPALITY_ID}/estate-by-address`;
    const res = await this.apiService.get<EstateInfoSearch[]>({ url, params: { address: query, maxHits: 10 } }, req.user);
    return { data: res.data, message: 'success' } as ResponseData;
  }

  @Get('/estateInfo/:designation')
  @OpenAPI({ summary: 'Fetch info for estate' })
  @UseBefore(authMiddleware)
  async fetchEstateInfo(@Req() req: RequestWithUser, @Param('designation') designation: string) {
    if (designation !== '') {
      const url = `estateinfo/2.0/${process.env.MUNICIPALITY_ID}/estate-by-designation`;
      const res = await this.apiService.get<EstateInfoSearch[]>({ url, params: { designation: designation, maxHits: 10 } }, req.user).catch(e => {
        throw new HttpException(400, 'Could not find estate for designation: ' + designation);
      });

      const indexOfEstate = res.data.findIndex(estate => estate.designation === designation);

      if (res.data.length !== 0 && indexOfEstate !== -1) {
        const url = `estateinfo/2.0/estate-data`;
        const result = await this.apiService
          .get<EstateInformation>({ url, params: { objectidentifier: res.data[indexOfEstate].objectidentifier } }, req.user)
          .catch(e => {
            throw new HttpException(400, 'Could not find estate information for objectidentifier: ' + res.data[0].objectidentifier);
          });
        return { data: result.data, message: 'success' } as ResponseData;
      }
    } else {
      throw new HttpException(400, 'Bad Request');
    }
  }
}
