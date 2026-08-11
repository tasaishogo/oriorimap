export default function Admin() {
  return (
    <section className="mx-auto max-w-5xl space-y-2 px-4 py-8">
      <h1 data-testid="page-heading" className="font-display text-2xl font-bold text-primary-dark">
        管理者画面
      </h1>
      <p className="text-muted-foreground">通報の一覧を確認し、非公開化や削除の対処を行います。</p>
    </section>
  );
}
