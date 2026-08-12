export default function OverlayView() {
  return (
    <section className="mx-auto max-w-5xl space-y-2 px-4 py-8">
      <h1 data-testid="page-heading" className="font-display text-2xl font-bold text-primary-dark">
        重ね合わせ地図閲覧
      </h1>
      <p className="text-muted-foreground">
        保存済みの重ね合わせ地図を、出典表示とともに閲覧できます。
      </p>
    </section>
  );
}
