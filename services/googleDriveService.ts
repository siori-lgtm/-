
/**
 * Google Drive フォルダからファイル一覧を取得する
 * フォルダは「リンクを知っている全員が閲覧可」である必要があります。
 */
export async function fetchDriveFileList(folderLink: string, apiKey: string): Promise<Record<string, string>> {
  // フォルダIDの抽出
  const folderIdMatch = folderLink.match(/folders\/([a-zA-Z0-9_-]+)/);
  const folderId = folderIdMatch ? folderIdMatch[1] : folderLink;

  if (!folderId) throw new Error("無効なフォルダURLまたはIDです。");

  // Google Drive API v3 files.list
  // q: 'folderId' in parents AND trashed = false
  // fields: files(id, name)
  const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name)&key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Google Driveからの取得に失敗しました。APIキーとフォルダの共有設定を確認してください。");
  }

  const data = await response.json();
  const fileMap: Record<string, string> = {};

  data.files.forEach((file: { id: string, name: string }) => {
    // 拡張子を除去してキーにする (例: 60A-2.png -> 60a-2)
    const key = file.name.replace(/\.[^/.]+$/, "").toLowerCase().trim();
    // 直接表示用のURLを作成
    const directUrl = `https://drive.google.com/uc?id=${file.id}`;
    fileMap[key] = directUrl;
  });

  return fileMap;
}
