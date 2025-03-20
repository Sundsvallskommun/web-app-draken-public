import { HttpException } from '@exceptions/HttpException';
import { RequestWithUser } from '@interfaces/auth.interface';
import ApiService from '@services/api.service';
import authMiddleware from '@middlewares/auth.middleware';
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';
import { validationMiddleware } from '@/middlewares/validation.middleware';
import { logger } from '@/utils/logger';
import { noteIsTjansteanteckning } from '@/services/errand-note.service';
import { apiURL } from '@/utils/util';
import { validateAction } from '@services/errand.service';
import { Errand as ErrandDTO, Note as NoteDTO } from '@/data-contracts/case-data/data-contracts';
import { CreateErrandNoteDto } from '@/interfaces/errand-note.interface';

export interface ResponseData {
  data: any;
  message: string;
}

@Controller()
export class CasedataNotesController {
  private apiService = new ApiService();
  SERVICE = `case-data/11.0`;

  @Patch('/casedata/:municipalityId/errands/:id/notes')
  @HttpCode(201)
  @OpenAPI({ summary: 'Add a note to an errand by id' })
  @UseBefore(authMiddleware, validationMiddleware(CreateErrandNoteDto, 'body'))
  async newNote(
    @Req() req: RequestWithUser,
    @Param('id') errandId: number,
    @Param('municipalityId') municipalityId: string,
    @Body() noteData: CreateErrandNoteDto,
  ): Promise<{ data: ErrandDTO; message: string }> {
    const allowed = await validateAction(municipalityId, errandId.toString(), req.user);
    if (noteIsTjansteanteckning(noteData.noteType) && !allowed) {
      // Public notes ("tjänsteanteckningar") are not allowed to be created by the user other than the errands administrator
      throw new HttpException(403, 'Not allowed');
    }
    const url = `${municipalityId}/${process.env.CASEDATA_NAMESPACE}/errands/${errandId}/notes`;
    const baseURL = apiURL(this.SERVICE);
    const response = await this.apiService.patch<ErrandDTO, CreateErrandNoteDto>({ url, baseURL, data: noteData }, req.user).catch(e => {
      logger.error('Something went wrong when patching note');
      logger.error(e);
      throw e;
    });
    return { data: response.data, message: `Note created on errand ${errandId}` };
  }

  @Patch('/casedata/:municipalityId/errands/:errandId/notes/:id')
  @OpenAPI({ summary: 'Save a modified existing note' })
  @UseBefore(authMiddleware)
  async cases(
    @Req() req: RequestWithUser,
    @Param('errandId') errandId: number,
    @Param('municipalityId') municipalityId: string,
    @Param('id') noteId: number,
    @Body() noteData: CreateErrandNoteDto,
  ): Promise<ResponseData> {
    if (!noteId) {
      throw 'Id not found. Cannot edit note without id.';
    }
    if (noteIsTjansteanteckning(noteData.noteType)) {
      throw new HttpException(403, 'Not allowed');
    }
    const url = `${municipalityId}/${process.env.CASEDATA_NAMESPACE}/errands/${errandId}/notes/${noteId}`;
    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.patch<any, CreateErrandNoteDto>({ url, baseURL, data: noteData }, req.user);
    return { data: 'ok', message: 'success' } as ResponseData;
  }

  @Delete('/casedata/:municipalityId/errands/:errandId/notes/:id')
  @HttpCode(201)
  @OpenAPI({ summary: 'Remove a note by id' })
  @UseBefore(authMiddleware)
  async removeNote(
    @Req() req: RequestWithUser,
    @Param('errandId') errandId: number,
    @Param('municipalityId') municipalityId: string,
    @Param('id') noteId: number,
  ): Promise<{ data: boolean; message: string }> {
    if (!noteId) {
      throw 'Id not found. Cannot delete note without id.';
    }
    const baseURL = apiURL(this.SERVICE);
    const noteUrl = `${municipalityId}/${process.env.CASEDATA_NAMESPACE}/errands/${errandId}/notes/${noteId}`;
    const note = await this.apiService.get<NoteDTO>({ url: noteUrl, baseURL }, req.user);
    if (noteIsTjansteanteckning(note.data.noteType)) {
      throw new HttpException(403, 'Forbidden');
    }
    const url = `${municipalityId}/${process.env.CASEDATA_NAMESPACE}/errands/${errandId}/notes/${noteId}`;
    const response = await this.apiService.delete<boolean>({ url, baseURL }, req.user).catch(e => {
      throw e;
    });
    return { data: response.data, message: `Note ${noteId} removed` };
  }

  @Get('/casedata/:municipalityId/errands/:errandId/notes/:id')
  @OpenAPI({ summary: 'Return a note by id' })
  @UseBefore(authMiddleware)
  async permits(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('errandId') errandId: number,
    @Param('municipalityId') municipalityId: string,
    @Res() response: any,
  ): Promise<ResponseData> {
    const url = `${municipalityId}/${process.env.CASEDATA_NAMESPACE}/errands/${errandId}/notes/${id}`;
    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.get<NoteDTO>({ url, baseURL }, req.user);
    return { data: res.data, message: 'success' } as ResponseData;
  }
}
