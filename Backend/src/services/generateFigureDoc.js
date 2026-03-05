import fs from "fs";
import path from "path";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  ImageRun,
  Header,
  Footer,
  TabStopType,
} from "docx";

export const generateFigureDoc = async ({
  applicantName,
  agentName,
  agentRole,
  figures, // array of image file paths
  signaturePath // optional path to signature image
}) => {
  const totalSheets = figures.length;
  const sections = [];

  // A4 Page width is roughly 11906 twips. 
  // With 720 twips (0.5 inch) margins, the right tab position should be around 10466.
  const rightTabPosition = 10400;

  figures.forEach((imagePath, index) => {
    const pageNumber = index + 1;

    sections.push({
      properties: {
        page: {
          size: {
            width: 11906, // A4 Portrait Width
            height: 16838, // A4 Portrait Height
          },
          margin: {
            top: 1700, // ~3cm
            right: 1700, // ~3cm
            bottom: 1700, // ~3cm
            left: 1700, // ~3cm
          },
        },
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: agentName || "Patent Officer",
                  bold: true,
                }),
              ],
            }),
            ...(agentRole ? [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: agentRole,
                    bold: true,
                  }),
                ],
              })
            ] : []),
            ...(signaturePath ? [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { before: 100 },
                children: [
                  new ImageRun({
                    data: fs.readFileSync(path.isAbsolute(signaturePath) ? signaturePath : path.join(process.cwd(), signaturePath)),
                    transformation: {
                      width: 150,
                      height: 60,
                    },
                  }),
                ],
              })
            ] : []),
          ],
        }),
      },
      children: [
        // --- Metadata Header (Inside Body) ---
        new Paragraph({
          tabStops: [
            {
              type: TabStopType.RIGHT,
              position: 8500, // Adjusted for 3cm margins
            },
          ],
          children: [
            new TextRun({
              text: "Applicant: ",
              bold: true,
            }),
            new TextRun({
              text: applicantName,
              bold: true,
            }),
            new TextRun({
              children: ["\t"],
            }),
            new TextRun({
              text: `No. of Sheets: ${totalSheets}`,
              bold: true,
            }),
          ],
        }),
        new Paragraph({
          tabStops: [
            {
              type: TabStopType.RIGHT,
              position: 8500,
            },
          ],
          children: [
            new TextRun({
              children: ["\t"],
            }),
            new TextRun({
              text: `Sheet No: ${pageNumber} of ${totalSheets}`,
              bold: true,
            }),
          ],
          spacing: { after: 600 },
        }),

        // --- Centered Figure ---
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 2000 }, // Push towards vertical center
          children: [
            new ImageRun({
              data: fs.readFileSync(path.isAbsolute(imagePath) ? imagePath : path.join(process.cwd(), imagePath)),
              transformation: {
                width: 450,
                height: 400,
              },
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 400, after: 800 },
          children: [
            new TextRun({
              text: `Fig ${pageNumber}`,
              bold: true,
              size: 24,
            }),
          ],
        }),
      ],
    });
  });

  const doc = new Document({
    sections,
  });

  const buffer = await Packer.toBuffer(doc);

  const outputFileName = `FigureDoc_${Date.now()}.docx`;
  const outputDir = path.join(process.cwd(), "uploads");
  const outputPath = path.join(outputDir, outputFileName);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, buffer);

  return outputPath;
};