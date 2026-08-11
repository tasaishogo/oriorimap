// OriOriMap API Lambda のエントリポイント（design §4.2）。
// T002 時点では疎通確認用の GET /api/health のみ。
// T006 で Hono アプリ（app.ts）へ委譲する形に置き換わる。
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

export const handler = (_event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> =>
  Promise.resolve({
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'ok' }),
  });
