import { pdfjs } from 'react-pdf';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { validateProjectPdfSize } from './projectPatternsRepository';

export function configureProjectPdfWorker() { pdfjs.GlobalWorkerOptions.workerSrc = workerUrl; }
configureProjectPdfWorker();
export const projectPdfOptions = {
  cMapUrl: `${import.meta.env.BASE_URL}pdf-assets/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `${import.meta.env.BASE_URL}pdf-assets/standard_fonts/`,
  wasmUrl: `${import.meta.env.BASE_URL}pdf-assets/wasm/`,
  isEvalSupported: false,
  stopAtErrors: true,
};
export async function validateProjectPdf(file: File): Promise<void> {
  validateProjectPdfSize(file);
  const data = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder('ascii').decode(data.subarray(0, 5)) !== '%PDF-') throw new Error('Scegli un file PDF valido.');
  const task = pdfjs.getDocument({ ...projectPdfOptions, data });
  let passwordProtected = false;
  const passwordRequest = new Promise<never>((_, reject) => {
    task.onPassword = () => { passwordProtected = true; reject(new Error('Password required')); };
  });
  try {
    const document = await Promise.race([task.promise, passwordRequest]);
    if (await document.getPermissions() !== null) { passwordProtected = true; throw new Error('Encrypted PDF'); }
    if (!document.numPages) throw new Error('PDF senza pagine.');
    // Parse page content too: a valid header/catalog alone is insufficient.
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const page = await document.getPage(pageNumber);
      await page.getOperatorList();
      page.cleanup();
    }
  } catch {
    throw new Error(passwordProtected ? 'I PDF protetti da password non sono supportati.' : 'Il PDF è corrotto o non può essere letto.');
  } finally { await task.destroy(); }
}
export { pdfjs };
