// OriOriMap 日次 cleanup バッチ（design §4.5）。
// T002 では EventBridge Scheduler との結線のみを確立する空実装。
// 3 系統（PENDING_DELETE 回収 / 未添付画像回収 / 退会の段階削除）の
// 冪等な実装は T029 で行う。
export const handler = (): Promise<{ status: string }> => Promise.resolve({ status: 'noop' });
