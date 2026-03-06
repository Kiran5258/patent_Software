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
  patent_officer,
  figures, // array of { buffer, originalname }
  signatureBuffer // optional buffer
}) => {
  const totalSheets = figures.length;
  const sections = [];

  const rightTabPosition = 10400;

  figures.forEach((fig, index) => {
    const pageNumber = index + 1;

    sections.push({
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1700, right: 1700, bottom: 1700, left: 1700 },
        },
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: patent_officer || "Patent Officer",
                  bold: true,
                }),
              ],
            }),
            ...(signatureBuffer ? [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { before: 100 },
                children: [
                  new ImageRun({
                    data: signatureBuffer,
                    transformation: { width: 150, height: 60 },
                  }),
                ],
              })
            ] : []),
          ],
        }),
      },
      children: [
        new Paragraph({
          tabStops: [{ type: TabStopType.RIGHT, position: 8500 }],
          children: [
            new TextRun({ text: "Applicant: ", bold: true }),
            new TextRun({ text: applicantName, bold: true }),
            new TextRun({ children: ["\t"] }),
            new TextRun({ text: `No. of Sheets: ${totalSheets}`, bold: true }),
          ],
        }),
        new Paragraph({
          tabStops: [{ type: TabStopType.RIGHT, position: 8500 }],
          children: [
            new TextRun({ children: ["\t"] }),
            new TextRun({ text: `Sheet No: ${pageNumber} of ${totalSheets}`, bold: true }),
          ],
          spacing: { after: 600 },
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 2000 },
          children: [
            new ImageRun({
              data: fig.buffer,
              transformation: { width: 450, height: 400 },
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 400, after: 800 },
          children: [
            new TextRun({ text: `Fig ${pageNumber}`, bold: true, size: 24 }),
          ],
        }),
      ],
    });
  });

  const doc = new Document({ sections });
  return await Packer.toBuffer(doc);
};
