export default function MyPage() {
  return (
    <section className="mx-auto max-w-5xl space-y-2 px-4 py-8">
      <h1 data-testid="page-heading" className="font-display text-2xl font-bold text-primary-dark">
        マイページ
      </h1>
      <p className="text-muted-foreground">自分が作成した地図・重ね合わせ地図の一覧です。</p>
    </section>
  );
}
