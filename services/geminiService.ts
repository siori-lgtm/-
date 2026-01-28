
import { GoogleGenAI, Type } from "@google/genai";
import { FilterConfig, ProblemSetResponse, FileItem, Question } from "../types";
import { PT_FIELDS } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * 個別の問題PDFファイルを解析する
 */
export async function processSingleExamPdf(
  file: FileItem,
  targetYear: string
): Promise<Question[]> {
  const mappingInstructions = PT_FIELDS
    .map(f => `- [${f.label}]: (キーワード: ${f.mappings.join("/")})`)
    .join("\n");

  const systemInstruction = `
    あなたは理学療法士国家試験（PT国試）の精密データ抽出エンジンです。
    提出されたPDFから設問を抽出し、以下のルールに従ってJSONで出力してください。

    【抽出ルール】
    1. **問題番号 (displayNumber)**: 
       - 「午前1」「午後1」などの表記から「${targetYear.replace(/[^0-9]/g, '')}A-1」や「${targetYear.replace(/[^0-9]/g, '')}P-1」の形式に変換。
    2. **設問本文 (body)**: 設問の文章のみを抽出。
    3. **選択肢 (options)**: 
       - 1番から5番まで全てのテキストを配列に格納。
       - 各要素から「1.」「2.」「①」「②」などの番号プレフィックスは削除。
       - 選択肢が空にならないよう、PDFから一言一句正確に取得。
    4. **正解 (correctAnswer)**: 資料内の赤枠または「解答：X」の表記から、1〜5の数値を特定。
    5. **分野 (category)**: 
       - 以下のリストから1つ選択。
    ${mappingInstructions}

    【出力形式】
    必ず {"questions": [...]} というJSONオブジェクトで返してください。
  `;

  const prompt = `このPDFから、${targetYear}の設問を、選択肢（1〜5番全て）を含めて正確に抽出してください。`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { 
        parts: [
          { inlineData: { mimeType: "application/pdf", data: file.base64 } },
          { text: prompt }
        ] 
      },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  displayNumber: { type: Type.STRING },
                  category: { type: Type.STRING },
                  body: { type: Type.STRING },
                  options: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    minItems: 5,
                    maxItems: 5
                  },
                  correctAnswer: { type: Type.STRING },
                  accuracyRate: { type: Type.NUMBER },
                  imageDescription: { type: Type.STRING }
                },
                required: ["displayNumber", "category", "body", "options", "correctAnswer", "accuracyRate"]
              }
            }
          },
          required: ["questions"]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{\"questions\":[]}");
    return (parsed.questions || []).map((q: any) => ({ ...q, year: targetYear }));
  } catch (error) {
    console.error(`Extraction Failed (${file.name}):`, error);
    return [];
  }
}

/**
 * 正答率PDFを解析する
 */
export async function processAccuracyPdf(files: FileItem[]): Promise<{ displayNumber: string, accuracyRate: number, category: string }[]> {
  const mappingInstructions = PT_FIELDS
    .map(f => `- [${f.label}] (キーワード: ${f.mappings.join("/")})`)
    .join("\n");

  const systemInstruction = `
    あなたは理学療法士国家試験の統計表解析官です。
    PDF内の表（問題番号、分野、正答率が並んでいる表）を解析し、JSONで出力してください。

    【解析ルール】
    1. **問題番号の特定**:
       - ページ上部の「午前」「午後」を確認。
       - 表の「No.」が1番なら、午前なら「XXA-1」、午後なら「XXP-1」とする（XXは年度）。
    2. **正答率の抽出**:
       - 「正答率」列の数値を抽出。
    3. **分野の変換**:
       - 略称を以下の正式名称に変換。
    ${mappingInstructions}

    必ず {"mappings": [...]} というJSONで返してください。
  `;

  const prompt = "表内の全問題（最大200問程度）を1つも漏らさずにリストアップしてください。";
  const fileParts = files.map(file => ({ inlineData: { mimeType: "application/pdf", data: file.base64 } }));

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [...fileParts, { text: prompt }] },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mappings: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  displayNumber: { type: Type.STRING },
                  accuracyRate: { type: Type.NUMBER },
                  category: { type: Type.STRING }
                },
                required: ["displayNumber", "accuracyRate", "category"]
              }
            }
          },
          required: ["mappings"]
        }
      }
    });

    const data = JSON.parse(response.text || "{\"mappings\":[]}");
    return data.mappings;
  } catch (error) {
    console.error("Accuracy Extraction Error:", error);
    throw error;
  }
}
