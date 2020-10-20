import express from 'express';
import multer from 'multer';
import DownloadController from '../controllers/DownloadController';
import pdfUpload from '../middlewares/pdfUploader';

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

// csv
router.post('/graph/to/csv-nodes', DownloadController.nodesToCsv);

router.post('/graph/to/csv-links', DownloadController.linksToCsv);

router.post('/csv/to/graph', upload.any(), DownloadController.csvToGraph);

// zip
router.post('/graph/to/csv-zip', DownloadController.graphToZip);

router.post('/csv-zip/to/graph', upload.single('file'), DownloadController.zipToGraph);

// xlsx
router.post('/graph/to/xlsx', DownloadController.graphToXlsx);

router.post('/xlsx/to/graph', upload.single('file'), DownloadController.xlsxToGraph);

router.post('/graph/to/png', DownloadController.svgToPing);

router.post('/graph/to/pdf', DownloadController.svgToPdf);

router.post('/google-sheets/to/graph', upload.single('file'), DownloadController.googleSheetsToGraph);

router.post('/linkedin-pdf/to/node', pdfUpload.single('file'), DownloadController.pdfToNode);

export default router;
