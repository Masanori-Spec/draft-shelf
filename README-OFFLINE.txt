DraftShelf / 原稿のコピー・Source document copy

ZIP を展開し、index.html を Chrome / Chromium で開いてください。サーバーやアカウントは不要です。
Extract the ZIP and open index.html in Chrome / Chromium. No server or account is needed.

novelWriter でプロジェクトを保存して閉じてから、そのフォルダーを選びます。
Save and close the project in novelWriter, then choose its project folder.
対象は novelWriter 26.2.1 / project format 1.6 revision 0 です。古い .nwd や圧縮プロジェクトは対象外です。
Scope: novelWriter 26.2.1 / project format 1.6 revision 0. Legacy .nwd and compressed projects are unsupported.

構成・本文・出力先を確認し、含める本文を選び、確認欄にチェックして ZIP を書き出します。
Review the tree, body text and output paths. Select bodies, acknowledge the review, then export the ZIP.
非アクティブな文書、ノート、Archive、Trash も最初は含みます。除外は明示的に選びます。
Inactive documents, notes, Archive and Trash are included initially. Exclusions are explicit.
除外した本文は ZIP に入りませんが、構成・名前・元のメタデータは manifest に残ります。
Excluded body text is omitted, but structure, labels and original metadata remain in the manifest.

元の本文のバイト列を残します。見出しで分割したり、標準 Markdown に変換したりしません。
Original body bytes are preserved. Headings are not split or converted to standard Markdown.
設定や履歴を含む完全なバックアップ、元アプリへの書き戻しには使えません。
This is not a full backup of settings/history or a round-trip editing format.

選択したファイルだけをブラウザ内で処理します。アップロードやネットワーク通信はありません。
Only selected files are processed, inside the browser. No uploads or background network requests.
確認表の印刷は、選択と出力パスのレポートです。原稿全文の印刷ではありません。
Print review covers selection and output paths, not the full manuscript.

ソースのみ。novelWriter、Qt、ブラウザのバイナリは含みません。
Source-only bundle. No novelWriter, Qt or browser binaries. No original-code license grant is included.
Source and verification: https://github.com/Masanori-Spec/draft-shelf
