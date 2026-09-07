import { logClientFailure } from '@common/services/client-diagnostics';
export const toBase64 = async (file: File): Promise<string> => {
  try {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    const result = await new Promise<string>((resolve, reject) => {
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1];
        resolve(base64);
      };
      reader.onerror = () => {
        reject(new Error('Unable to read file'));
      };
    });
    return result;
  } catch (error) {
    logClientFailure('common.toBase64.toBase64', error);
    throw error;
  }
};
