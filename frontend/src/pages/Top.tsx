export default function Top() {
  return (
    <section className="mx-auto max-w-5xl space-y-2 px-4 py-8">
      <h1 data-testid="page-heading" className="font-display text-2xl font-bold text-primary-dark">
        トップ / 検索・一覧
      </h1>
      <p className="text-muted-foreground">
        キーワードで地図を検索したり、新着・更新順の一覧から探せます。
      </p>
    </section>
  );
}
