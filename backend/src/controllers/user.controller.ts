import { MUNICIPALITY_ID } from '@/config';
import { PortalPersonData } from '@/data-contracts/employee/data-contracts';
import { HttpException } from '@/exceptions/HttpException';
import { RequestWithUser } from '@/interfaces/auth.interface';
import { Permissions } from '@/interfaces/users.interface';
import ApiService from '@/services/api.service';
import authMiddleware from '@middlewares/auth.middleware';
import { PrismaClient } from '@prisma/client';
import { Controller, Get, Header, Param, QueryParam, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

const prisma = new PrismaClient();

interface UserData {
  name: string;
  firstName: string;
  lastName: string;
  username: string;
  userSettings: any;
  permissions: Permissions;
}

interface EmployeeAddress {
  personid: string;
  givenname: string;
  lastname: string;
  fullname: string;
  address: string;
  postalCode: string;
  city: string;
  workPhone: string;
  mobilePhone: string;
  aboutMe: string;
  email: string;
  mailNickname: string;
  company: string;
  companyId: number;
  orgTree: string;
  referenceNumber: string;
  isManager: boolean;
  loginName: string;
}

@Controller()
export class UserController {
  private apiService = new ApiService();

  @Get('/me')
  @OpenAPI({ summary: 'Return current user' })
  @UseBefore(authMiddleware)
  async getUser(@Req() req: RequestWithUser, @Res() response: any): Promise<UserData> {
    const { name, firstName, lastName, username, permissions } = req.user;

    if (!name) {
      throw new HttpException(400, 'Bad Request');
    }

    let userSettings = await prisma.userSettings.findFirst({
      where: {
        username: req.user.username,
      },
    });

    if (!userSettings) {
      userSettings = await prisma.userSettings.create({
        data: {
          username: req.user.username,
          readNotificationsClearedDate: new Date().toISOString(),
        },
      });
    }

    userSettings && delete userSettings.id;
    userSettings && delete userSettings.username;

    const userData: UserData = {
      name,
      firstName,
      lastName,
      username,
      userSettings,
      permissions,
    };

    return response.send({ data: userData, message: 'success' });
  }

  @Get('/user/avatar')
  @OpenAPI({ summary: 'Return logged in person image' })
  @UseBefore(authMiddleware)
  @Header('Content-Type', 'image/jpeg')
  @Header('Cross-Origin-Embedder-Policy', 'require-corp')
  @Header('Cross-Origin-Resource-Policy', 'cross-origin')
  async getMyEmployeeImage(@Req() req: RequestWithUser, @QueryParam('width') width): Promise<any> {
    const { personId } = req.user;

    if (!personId) {
      throw new HttpException(400, 'Bad Request');
    }

    const url = `employee/2.0/${MUNICIPALITY_ID}/${personId}/personimage`;
    const res = await this.apiService.get<any>(
      {
        url,
        responseType: 'arraybuffer',
        params: {
          width: width,
        },
      },
      req.user,
    );
    return res.data;
  }

  @Get('/user/:personId/avatar')
  @OpenAPI({ summary: 'Return another users image' })
  @UseBefore(authMiddleware)
  @Header('Content-Type', 'image/jpeg')
  @Header('Cross-Origin-Embedder-Policy', 'require-corp')
  @Header('Cross-Origin-Resource-Policy', 'cross-origin')
  async getEmployeeImage(@Req() req: RequestWithUser, @Param('personId') personId: string, @QueryParam('width') width): Promise<any> {
    if (!personId) {
      throw new HttpException(400, 'Bad Request');
    }

    const url = `employee/2.0/${MUNICIPALITY_ID}/${personId}/personimage`;
    const res = await this.apiService.get<any>(
      {
        url,
        responseType: 'arraybuffer',
        params: {
          width: width,
        },
      },
      req.user,
    );
    return res.data;
  }

  @Get('/user/:adaccount')
  @OpenAPI({ summary: 'Return employee info' })
  @UseBefore(authMiddleware)
  @Header('Content-Type', 'image/jpeg')
  @Header('Cross-Origin-Embedder-Policy', 'require-corp')
  @Header('Cross-Origin-Resource-Policy', 'cross-origin')
  async getEmployeeInfo(@Req() req: RequestWithUser, @Param('adaccount') adaccount: string, @QueryParam('width') width): Promise<any> {
    if (!adaccount) {
      throw new HttpException(400, 'Bad Request');
    }

    const url = `employee/2.0/${MUNICIPALITY_ID}/portalpersondata/PERSONAL/${adaccount}`;
    const res = await this.apiService.get<PortalPersonData>(
      {
        url,
      },
      req.user,
    );
    return res.data;
  }
}
