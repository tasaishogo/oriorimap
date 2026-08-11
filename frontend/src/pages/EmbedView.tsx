export default function EmbedView() {
  return (
    <section className="space-y-2 p-4">
      <h1 data-testid="page-heading" className="font-display text-2xl font-bold text-primary-dark">
        embedビュー
      </h1>
      <p className="text-muted-foreground">
        埋め込み専用の閲覧画面です。帰属表記とOriOriMapで開くリンクを表示します。
      </p>
    </section>
  );
}
