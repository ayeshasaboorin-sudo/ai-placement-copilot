
import { NextResponse } from "next/server";
import PDFParser from "pdf2json";
import mammoth from "mammoth";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("resume");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Please select a resume file." },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "The selected file is empty." },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File must be smaller than 5 MB." },
        { status: 400 }
      );
    }

    const filename = file.name;
    const lowerName = filename.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());

    let text = "";

    if (lowerName.endsWith(".pdf")) {
      text = await new Promise<string>((resolve, reject) => {
        const parser = new PDFParser(null, true);

        parser.on("pdfParser_dataError", (error: { parserError?: unknown }) => {
          reject(
            error.parserError instanceof Error
              ? error.parserError
              : new Error(String(error.parserError ?? "Could not parse PDF."))
          );
        });

        parser.on("pdfParser_dataReady", () => {
          try {
            resolve(parser.getRawTextContent());
          } catch (error) {
            reject(error);
          }
        });

        try {
          parser.parseBuffer(buffer);
        } catch (error) {
          reject(error);
        }
      });
    } else if (lowerName.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (lowerName.endsWith(".txt")) {
      text = buffer.toString("utf8");
    } else {
      return NextResponse.json(
        { error: "Only PDF, DOCX, and TXT files are supported." },
        { status: 400 }
      );
    }

    text = text.trim();

    if (!text) {
      return NextResponse.json(
        {
          error:
            "No readable text found. If this is a scanned PDF, OCR may be required.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      text,
      filename,
    });
  } catch (error) {
    console.error("Resume extraction failed:", error);

    return NextResponse.json(
      {
        error: "Could not read this resume.",
        details:
          error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
