
import { GoogleGenAI, Type } from "@google/genai";
import { FilterConfig, ProblemSetResponse, FileItem } from "../types";
import { PT_FIELDS } from "../constants";

export async function processExamPdfs(
  questionPdfs: FileItem[],
  dataPdfs: FileItem[],
  config: FilterConfig
): Promise<ProblemSetResponse> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // 選択された分野の定義と、PDF内略称との紐付けガイドを作成
  const mappingInstructions = PT_FIELDS
    .filter(f => config.fields.includes(f.label))
    .map(f => `- ${f.label}: [PDF内の略称ターゲット: ${f.mappings.join(", ")}] 詳細: ${f.details}`)
    .join("\n");

  const systemInstruction = `
    あなたは理学療法士国家試験（PT国試）の分析および問題集作成の専門家です。
    提供される試験問題PDFと正答率データPDFから、ユーザーの指定条件に合致する問題を「漏れなく」抽出することが任務です。

    【解析ワークフロー】
    1. **正答率照合**: 正答率PDFを走査し、各問題番号（例: 60A-12）の「4校正答率」と「分野略称」を特定します。
    2. **フィルタリング**: 指定された「正答率下限値（${config.accuracyThreshold === 'all' ? 'なし' : config.accuracyThreshold + '%'}）」および「選択された分野」の両方を満たす問題番号をリストアップします。
    3. **問題抽出**: リストアップした問題番号に対応する問題を、試験問題PDFから全て抽出します。
    4. **ビジュアル解析**: 図、写真、グラフ、表が含まれる場合は、その内容を「試験に出るポイント」を押さえて詳細に言語化し、imageDescriptionに記述してください。

    【分野マッピング定義】
    PDF内の略称を以下の抽出分野にマッピングしてください：
    ${mappingInstructions}

    【出力仕様】
    - 出力は必ずJSON形式。
    - categoryには抽出分野名（例: 臨床症例（運動器））を直接入れてください。
    - displayNumberは「[回][区分]-[番号]」（例: 60A-4）の形式で統一してください。
  `;

  const prompt = `
    アップロードされた全ての資料を精査し、条件に合致する問題を1問も漏らさずに抽出して、一冊の問題集として構成してください。
    
    【抽出条件】
    - 4校正答率: ${config.accuracyThreshold === 'all' ? '全範囲' : config.accuracyThreshold + '%以上'}
    - 抽出対象分野: ${config.fields.join(", ")}
    
    PDFの全ページ、全テーブルを確実にチェックしてください。該当する問題が10問以上ある場合でも、制限なく可能な限り全て出力してください。
  `;

  const questionParts = questionPdfs.map(file => ({
    inlineData: { mimeType: "application/pdf", data: file.base64 }
  }));
  
  const dataParts = dataPdfs.map(file => ({
    inlineData: { mimeType: "application/pdf", data: file.base64 }
  }));

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          ...questionParts,
          ...dataParts,
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
                    items: { type: Type.STRING }
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

    const resultText = response.text || "{}";
    return JSON.parse(resultText) as ProblemSetResponse;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}
