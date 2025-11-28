import { SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { HttpException } from '@/exceptions/HttpException';
import { RequestWithUser } from '@/interfaces/auth.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import { hasPermissions } from '@/middlewares/permissions.middleware';
import { validationMiddleware } from '@/middlewares/validation.middleware';
import ApiService from '@/services/api.service';
import { logger } from '@/utils/logger';
import { IsOptional, IsString } from 'class-validator';
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

interface SupportNote {
  context: string;
  role: string;
  partyId?: string;
  subject: string;
  body: string;
  createdBy: string;
}

class SupportNoteDto {
  @IsString()
  @IsOptional()
  context: string;
  @IsString()
  @IsOptional()
  role: string;
  @IsString()
  @IsOptional()
  partyId?: string;
  @IsString()
  @IsOptional()
  subject: string;
  @IsString()
  body: string;
}

class SupportNoteUpdateDto {
  @IsString()
  @IsOptional()
  modifiedBy?: string;
  @IsOptional()
  @IsString()
  subject?: string;
  @IsString()
  body: string;
}

export interface SupportNoteResponse {
  id: string;
  context: string;
  role: string;
  clientId: string;
  partyId: string;
  subject: string;
  body: string;
  caseId: string;
  createdBy: string;
  created: string;
}

export interface SupportNoteData {
  notes: SupportNoteResponse[];
  _meta: {
    page: 1;
    limit: 100;
    count: 1;
    totalRecords: 1;
    totalPages: 1;
  };
}

@Controller()
@UseBefore(hasPermissions(['canEditSupportManagement']))
export class SupportNoteController {
  private apiService = new ApiService();
  private namespace = SUPPORTMANAGEMENT_NAMESPACE;
  private SERVICE = apiServiceName('supportmanagement');

  @Get('/supportnotes/:municipalityId/:id')
  @OpenAPI({ summary: 'Get notes for errand' })
  @UseBefore(authMiddleware)
  async fetchSupportNotes(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Res() response: any,
  ): Promise<SupportNoteData> {
    const queryObject = {
      context: 'SUPPORT',
      role: 'FIRST_LINE_SUPPORT',
      page: '1',
      limit: '100',
    };
    const queryString = new URLSearchParams(queryObject).toString();
    const url = `${this.SERVICE}/${municipalityId}/${this.namespace}/errands/${id}/notes?${queryString}`;
    const res = await this.apiService.get<SupportNoteData>({ url }, req.user);
    return response.status(200).send(res.data);
  }

  @Post('/supportnotes/:municipalityId/:id')
  @HttpCode(201)
  @OpenAPI({ summary: 'Create a support note' })
  @UseBefore(authMiddleware, validationMiddleware(SupportNoteDto, 'body'))
  async createSupportNote(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Body() noteDto: Partial<SupportNoteDto>,
    @Res() response: any,
  ): Promise<{ data: any; message: string }> {
    const url = `${this.SERVICE}/${municipalityId}/${this.namespace}/errands/${id}/notes`;
    let data: SupportNote;
    if (noteDto.body) {
      data = {
        context: 'SUPPORT',
        role: 'FIRST_LINE_SUPPORT',
        ...(noteDto.partyId && { partyId: noteDto.partyId }),
        subject: 'Notering',
        body: noteDto.body,
        createdBy: req.user.name,
      };
    } else {
      logger.error('Trying to save note without body');
      throw new Error('Note body missing');
    }
    const res = await this.apiService.post<any, SupportNoteDto>({ url, data }, req.user).catch(e => {
      logger.error('Error when creating note');
      logger.error(e);
      throw e;
    });
    return response.status(201).send(res.data);
  }

  @Patch('/supportnotes/:municipalityId/:errandId/notes/:noteId')
  @HttpCode(201)
  @OpenAPI({ summary: 'Update a support note' })
  @UseBefore(authMiddleware, validationMiddleware(SupportNoteUpdateDto, 'body'))
  async updateSupportNote(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Param('errandId') errandId: string,
    @Param('noteId') noteId: string,
    @Body() noteDto: Partial<SupportNoteUpdateDto>,
    @Res() response: any,
  ): Promise<{ data: any; message: string }> {
    const url = `${this.SERVICE}/${municipalityId}/${this.namespace}/errands/${errandId}/notes/${noteId}`;
    let data: SupportNoteUpdateDto;
    if (noteDto.body) {
      data = {
        modifiedBy: req.user.name,
        subject: 'Anteckning',
        body: noteDto.body,
      };
    } else {
      logger.error('Trying to save note without body');
      throw new Error('Note body missing');
    }
    const res = await this.apiService.patch<any, SupportNoteUpdateDto>({ url, data }, req.user).catch(e => {
      logger.error('Error when updaiing note');
      logger.error(e);
      throw e;
    });
    return response.status(200).send(res.data);
  }

  @Delete('/supportnotes/:municipalityId/:errandId/notes/:noteId')
  @OpenAPI({ summary: 'Get notes for errand' })
  @UseBefore(authMiddleware)
  async deleteSupportNote(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Param('errandId') errandId: string,
    @Param('noteId') noteId: string,
    @Res() response: any,
  ): Promise<SupportNoteData> {
    const url = `${this.SERVICE}/${municipalityId}/${this.namespace}/errands/${errandId}/notes/${noteId}`;
    const res = await this.apiService.delete<SupportNoteData>({ url }, req.user);
    return response.status(204).send(res.data);
  }
}
