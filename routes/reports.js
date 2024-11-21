import { Router } from "express";
import { verifyToken } from "../middlewares/auth.js";
import { validateCustomHeader } from "../middlewares/customHeader.js";
import { ReportModel } from "../models/ReportModel.js";
import ExcelJS from "exceljs";
import { sendEmailWithAttachment } from "../utils/email.js"; // Import the email utility

const router = Router();

export default function reportRoutes(pool) {
  const reportModel = new ReportModel(pool);

  /**
   * @swagger
   * tags:
   *   name: Report
   *   description: Report API
   */

  /**
   * @swagger
   * /report:
   *   get:
   *     tags: [Report]
   *     summary: Get main dashboard report
   *     parameters:
   *       - in: query
   *         name: initDate
   *         schema:
   *           type: date
   *         description: Filter by init date, yyyy-m-d H:i:s
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: date
   *         description: Filter by end date, yyyy-m-d H:i:s
   *     responses:
   *       200:
   *         description: Returns the report
   *       401:
   *         description: Unauthorized access
   *       500:
   *         description: Error getting the report
   */
  router.get("/", verifyToken, validateCustomHeader, async (req, res) => {
    let { initDate, endDate } = req.query;

    try {
      const report = await reportModel.getReport(initDate, endDate);
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Error getting the report." });
    }
  });

  /**
   * @swagger
   * /report/download:
   *   get:
   *     tags: [Report]
   *     summary: Download reports or send via email
   *     parameters:
   *       - in: query
   *         name: initDate
   *         schema:
   *           type: date
   *         description: Filter by init date, yyyy-m-d H:i:s
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: date
   *         description: Filter by end date, yyyy-m-d H:i:s
   *       - in: query
   *         name: email
   *         schema:
   *           type: string
   *         description: Email address to send the report to (optional)
   *     responses:
   *       200:
   *         description: Returns the XLS report or sends it via email
   *       401:
   *         description: Unauthorized access
   *       500:
   *         description: Error processing the request
   */
  router.get(
    "/download",
    verifyToken,
    validateCustomHeader,
    async (req, res) => {
      let { initDate, endDate, email } = req.query;

      try {
        const report = await reportModel.getDetailsReport(initDate, endDate);

        const workbook = new ExcelJS.Workbook();

        const sheet0 = workbook.addWorksheet("reportePrincipal");
        const sheet1 = workbook.addWorksheet("conversaciones");
        const sheet2 = workbook.addWorksheet("mensajesRecibidos");
        const sheet3 = workbook.addWorksheet("mensajesEnviados");
        const sheet4 = workbook.addWorksheet("mensajesEnviadosBot");
        const sheet5 = workbook.addWorksheet("mensajesRecibidosCampanias");

        const headers0 = report.reportePrincipal.length
          ? Object.keys(report.reportePrincipal[0])
          : [];
        sheet0.addRow(headers0);
        report.reportePrincipal.forEach((fila) => {
          sheet0.addRow(Object.values(fila));
        });

        const headers1 = report.conversaciones.length
          ? Object.keys(report.conversaciones[0])
          : [];
        sheet1.addRow(headers1);
        report.conversaciones.forEach((fila) => {
          sheet1.addRow(Object.values(fila));
        });

        const headers2 = report.mensajesRecibidos.length
          ? Object.keys(report.mensajesRecibidos[0])
          : [];
        sheet2.addRow(headers2);
        report.mensajesRecibidos.forEach((fila) => {
          sheet2.addRow(Object.values(fila));
        });

        const headers3 = report.mensajesEnviados.length
          ? Object.keys(report.mensajesEnviados[0])
          : [];
        sheet3.addRow(headers3);
        report.mensajesEnviados.forEach((fila) => {
          sheet3.addRow(Object.values(fila));
        });

        const headers4 = report.mensajesEnviadosBot.length
          ? Object.keys(report.mensajesEnviadosBot[0])
          : [];
        sheet4.addRow(headers4);
        report.mensajesEnviadosBot.forEach((fila) => {
          sheet4.addRow(Object.values(fila));
        });

        const headers5 = report.mensajesRecibidosCampanias.length
          ? Object.keys(report.mensajesRecibidosCampanias[0])
          : [];
        sheet5.addRow(headers5);
        report.mensajesRecibidosCampanias.forEach((fila) => {
          sheet5.addRow(Object.values(fila));
        });

        if (email) {
          const buffer = await workbook.xlsx.writeBuffer();
          await sendEmailWithAttachment(
            email,
            buffer,
            `Reporte_Whatsapp_${initDate}_${endDate}.xlsx`
          );
          return res.status(200).json({ message: "Email sent successfully." });
        } else {
          res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          );
          res.setHeader(
            "Content-Disposition",
            `attachment; filename=Reporte_WhatsappEF_${initDate}_${endDate}.xlsx`
          );

          return workbook.xlsx
            .write(res)
            .then(() => {
              res.status(200).end();
            })
            .catch((err) => {
              console.error(err);
              res
                .status(500)
                .json({ message: "Error downloading the report." });
            });
        }
      } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Error processing the request." });
      }
    }
  );

  return router;
}
