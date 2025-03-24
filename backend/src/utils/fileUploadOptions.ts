import { Request } from 'express';
import multer from 'multer';
import path from 'path';

type DestinationCallback = (error: Error | null, destination: string) => void;
type FileNameCallback = (error: Error | null, filename: string) => void;
type FilterFileNameCallback = (error: Error | null, pass: boolean) => void;

const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb: DestinationCallback) => {
    cb(null, `data/uploads`);
  },
  filename: (_req: Request, file: Express.Multer.File, cb: FileNameCallback) => {
    const fileName = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, fileName + path.extname(file.originalname));
  },
});

const allowedMimeTypes = [
  'image/jpeg',
  'image/gif',
  'image/gif',
  'image/png',
  'image/tiff',
  'image/bmp',
  'application/pdf',
  'application/rtf',
  'application/msword',
  'text/plain',
  'text/html',
  'application/octet-stream',
  'application/vnd.ms-excel',
  'application/vnd.ms-outlook',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

const fileFilter = (_request: Request, file: Express.Multer.File, callback: FilterFileNameCallback): void => {
  file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
  if (allowedMimeTypes.includes(file.mimetype)) {
    callback(null, true);
  } else {
    callback(null, false);
  }
};

const uploadOptions = () => ({
  limits: {
    fieldNameSize: 255,
    fileSize: 1024 * 1024 * 50, // 50mb
  },
  storage: multer.memoryStorage(),
  fileFilter,
});

export const fileUploadOptions = uploadOptions();
