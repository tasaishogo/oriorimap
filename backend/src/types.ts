// Hono の Bindings 型（Lambda 実行時は API Gateway イベントそのものが c.env になる。
// hono/aws-lambda の handle() が event を直接 env として渡す契約に依る）。
export type Bindings = {
  requestContext?: {
    requestId?: string;
    authorizer?: {
      jwt?: {
        claims: Record<string, string | number | boolean | string[]>;
      };
    };
  };
};
