
export interface PTField {
  label: string;
  mappings: string[]; // PDF略称との紐付け用
}

// 資料（PDF）に基づいた分野設定
export const PT_FIELDS: PTField[] = [
  { label: "評価", mappings: ["評価"] },
  { label: "内部", mappings: ["内部"] },
  { label: "中枢", mappings: ["中枢"] },
  { label: "運動器", mappings: ["運動器"] },
  { label: "運動学", mappings: ["運動学"] },
  { label: "小児", mappings: ["小児"] },
  { label: "精神", mappings: ["精神"] },
  { label: "ADL", mappings: ["ADL"] },
  { label: "リハ概", mappings: ["リハ概", "リハビリテーション概論"] },
  { label: "義肢", mappings: ["義肢", "義装", "義肢装具学"] },
  { label: "心理", mappings: ["心理"] },
  { label: "物療", mappings: ["物療", "物理療法学"] },
  { label: "人発", mappings: ["人発", "人間発達学"] }
];

export const ACCURACY_OPTIONS = [
  { value: 'all', label: 'すべて' },
  { value: '80', label: '正答率 80%以上' },
  { value: '60', label: '正答率 60%以上' },
  { value: '40', label: '正答率 40%以上' }
];
