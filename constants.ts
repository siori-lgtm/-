
export interface PTField {
  label: string;
  category: string; // 大項目
  details: string; // 中項目・内容詳細
  mappings: string[]; // 正答率PDF内の略称との紐付け用
}

export const PT_FIELDS: PTField[] = [
  // 1. 実地問題 (図・画像・症例問題)
  { label: "臨床症例（運動器）", category: "1. 【実地問題】", details: "骨折術後、変形性関節症、スポーツ外傷の症例解釈", mappings: ["運動器", "評価"] },
  { label: "臨床症例（脳血管）", category: "1. 【実地問題】", details: "脳卒中、脊髄損傷の急性期〜回復期評価", mappings: ["中枢", "評価"] },
  { label: "臨床症例（内部障害）", category: "1. 【実地問題】", details: "心不全、COPDの運動負荷試験・リスク管理", mappings: ["内部", "評価"] },
  { label: "画像・波形診断", category: "1. 【実地問題】", details: "X線、MRI、CT、心電図、筋電図の読み取り", mappings: ["内部", "中枢", "運動器"] },
  { label: "動作分析", category: "1. 【実地問題】", details: "異常歩行の目視判別、代償動作の特定", mappings: ["運動学", "ADL"] },
  
  // 2. 専門問題
  { label: "理学療法評価学", category: "2. 【専門問題】", details: "形態測定、ROM、MMT、反射、ADL（FIM/BI）", mappings: ["評価", "ADL"] },
  { label: "理学療法治療学", category: "2. 【専門問題】", details: "中枢神経（脳卒中、パーキンソン）、運動器（骨折、OA）、内部障害（循環・呼吸・代謝）、小児（脳性麻痺）、神経筋疾患（ALS、MG）", mappings: ["中枢", "運動器", "内部", "小児"] },
  { label: "物理療法学", category: "2. 【専門問題】", details: "電気、温熱、水、牽引、レーザー", mappings: ["物療"] },
  { label: "義肢装具学", category: "2. 【専門問題】", details: "下肢装具、義足のパーツ、車椅子の適合", mappings: ["義装"] },
  
  // 3. 基礎問題
  { label: "解剖学", category: "3. 【基礎問題】", details: "骨関節系、筋系、神経系、循環器、呼吸器、消化器", mappings: ["解剖"] },
  { label: "生理学", category: "3. 【基礎問題】", details: "神経生理、筋肉生理、呼吸生理、循環生理、代謝・内分泌", mappings: ["生理"] },
  { label: "運動学", category: "3. 【基礎問題】", details: "運動力学（てこ・重心）、バイオメカニクス、歩行分析、発達", mappings: ["運動学", "人発"] },
  { label: "人間発達学・心理学・精神医学", category: "3. 【基礎問題】", details: "小児の発達、心理的反応、精神疾患", mappings: ["精神", "心理", "人発", "小児"] },
  { label: "リハビリテーション概論・関係法規", category: "3. 【基礎問題】", details: "リハの定義、法律、倫理", mappings: ["リハ概"] }
];

export const ACCURACY_OPTIONS = [
  { value: 'all', label: 'すべて' },
  { value: '80', label: '4校正答率 80%以上' },
  { value: '60', label: '4校正答率 60%以上' },
  { value: '40', label: '4校正答率 40%以上' }
];
