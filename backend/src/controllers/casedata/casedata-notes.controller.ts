import { MUNICIPALITY_ID } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { Errand as ErrandDTO, Note as NoteDTO } from '@/data-contracts/case-data/data-contracts';
import { CreateErrandNoteDto } from '@/interfaces/errand-note.interface';
import { validationMiddleware } from '@/middlewares/validation.middleware';
import { noteIsTjansteanteckning } from '@/services/errand-note.service';
import { logger } from '@/utils/logger';
import { apiURL } from '@/utils/util';
import { HttpException } from '@exceptions/HttpException';
import { RequestWithUser } from '@interfaces/auth.interface';
import authMiddleware from '@middlewares/auth.middleware';
import ApiService from '@services/api.service';
import { validateAction } from '@services/errand.service';
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Req, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

export interface ResponseData {
  data: any;
  message: string;
}

@Controller()
export class CasedataNotesController {
  private apiService = new ApiService();
  SERVICE = apiServiceName('case-data');

  @Patch('/casedata/errands/:id/notes')
  @HttpCode(201)
  @OpenAPI({ summary: 'Add a note to an errand by id' })
  @UseBefore(authMiddleware, validationMiddleware(CreateErrandNoteDto, 'body'))
  async newNote(
    @Req() req: RequestWithUser,
    @Param('id') errandId: number,
    @Body() noteData: CreateErrandNoteDto,
  ): Promise<{ data: ErrandDTO; message: string }> {
    const allowed = await validateAction(errandId.toString(), req.user);
    if (noteIsTjansteanteckning(noteData.noteType) && !allowed) {
      // Public notes ("tjänsteanteckningar") are not allowed to be created by the user other than the errands administrator
      throw new HttpException(403, 'Not allowed');
    }
    const url = `${MUNICIPALITY_ID}/${process.env.CASEDATA_NAMESPACE}/errands/${errandId}/notes`;
    const baseURL = apiURL(this.SERVICE);
    const response = await this.apiService.patch<ErrandDTO, CreateErrandNoteDto>({ url, baseURL, data: noteData }, req.user).catch(e => {
      logger.error('Something went wrong when patching note');
      logger.error(e);
      throw e;
    });
    return { data: response.data, message: `Note created on errand ${errandId}` };
  }

  @Patch('/casedata/errands/:errandId/notes/:id')
  @OpenAPI({ summary: 'Save a modified existing note' })
  @UseBefore(authMiddleware)
  async cases(
    @Req() req: RequestWithUser,
    @Param('errandId') errandId: number,
    @Param('id') noteId: number,
    @Body() noteData: CreateErrandNoteDto,
  ): Promise<ResponseData> {
    if (!noteId) {
      throw 'Id not found. Cannot edit note without id.';
    }
    if (noteIsTjansteanteckning(noteData.noteType)) {
      throw new HttpException(403, 'Not allowed');
    }
    const url = `${MUNICIPALITY_ID}/${process.env.CASEDATA_NAMESPACE}/errands/${errandId}/notes/${noteId}`;
    const baseURL = apiURL(this.SERVICE);
    await this.apiService.patch<any, CreateErrandNoteDto>({ url, baseURL, data: noteData }, req.user);
    return { data: 'ok', message: 'success' } as ResponseData;
  }

  @Delete('/casedata/errands/:errandId/notes/:id')
  @HttpCode(201)
  @OpenAPI({ summary: 'Remove a note by id' })
  @UseBefore(authMiddleware)
  async removeNote(
    @Req() req: RequestWithUser,
    @Param('errandId') errandId: number,
    @Param('id') noteId: number,
  ): Promise<{ data: boolean; message: string }> {
    if (!noteId) {
      throw 'Id not found. Cannot delete note without id.';
    }
    const baseURL = apiURL(this.SERVICE);
    const noteUrl = `${MUNICIPALITY_ID}/${process.env.CASEDATA_NAMESPACE}/errands/${errandId}/notes/${noteId}`;
    const note = await this.apiService.get<NoteDTO>({ url: noteUrl, baseURL }, req.user);
    if (noteIsTjansteanteckning(note.data.noteType)) {
      throw new HttpException(403, 'Forbidden');
    }
    const url = `${MUNICIPALITY_ID}/${process.env.CASEDATA_NAMESPACE}/errands/${errandId}/notes/${noteId}`;
    const response = await this.apiService.delete<boolean>({ url, baseURL }, req.user).catch(e => {
      throw e;
    });
    return { data: response.data, message: `Note ${noteId} removed` };
  }

  @Get('/casedata/errands/:errandId/notes/:id')
  @OpenAPI({ summary: 'Return a note by id' })
  @UseBefore(authMiddleware)
  async permits(@Req() req: RequestWithUser, @Param('id') id: string, @Param('errandId') errandId: number): Promise<ResponseData> {
    const url = `${MUNICIPALITY_ID}/${process.env.CASEDATA_NAMESPACE}/errands/${errandId}/notes/${id}`;
    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.get<NoteDTO>({ url, baseURL }, req.user);
    return { data: res.data, message: 'success' } as ResponseData;
  }
}
