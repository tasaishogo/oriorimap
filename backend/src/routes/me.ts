import { Hono } from 'hono';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddbDocClient } from '../lib/dynamodb.js';
import { AppError } from '../lib/errors.js';
import type { Bindings } from '../types.js';

// design §6 Userの形状（shared/schemas/user.ts のuserSchemaと同じ属性）。
// npm workspaces のシンボリックリンクはSAMのesbuildビルド（backend/だけを
// 分離ディレクトリへコピーしてnpm installする）からは解決できないため、
// ここではshared/をimportせずローカルに定義する。DynamoDBは自分で書いた
// 信頼済みデータのため、外部境界向けのzod検証は不要（トップレベル方針）。
interface UserProfile {
  userId: string;
  displayName: string;
  status: 'active' | 'pending_delete';
  deleteRequestedAt?: string;
  createdAt: string;
}

function claimString(
  claims: Record<string, string | number | boolean | string[]> | undefined,
  key: string,
): string | undefined {
  const value = claims?.[key];
  return typeof value === 'string' ? value : undefined;
}

function toProfile(userId: string, item: Record<string, unknown>): UserProfile {
  return {
    userId,
    displayName: String(item.displayName),
    status: item.status === 'pending_delete' ? 'pending_delete' : 'active',
    deleteRequestedAt:
      typeof item.deleteRequestedAt === 'string' ? item.deleteRequestedAt : undefined,
    createdAt: String(item.createdAt),
  };
}

export const meRoutes = new Hono<{ Bindings: Bindings }>();

// GET /api/me（design §4.2 オーナー系・design §6 User）。
// 未ログインはAPI Gateway側のJWT Authorizerが401で弾くため、ここに到達する時点で
// JWTは検証済み。DynamoDBにプロフィールが無ければ初回アクセスとして自動作成する
// （R1.2「初回はアカウントを自動作成」。displayNameはCognitoのnameクレーム由来）。
meRoutes.get('/api/me', async (c) => {
  const claims = c.env?.requestContext?.authorizer?.jwt?.claims;
  const userId = claimString(claims, 'sub');
  if (!userId) {
    throw new AppError(401, 'UNAUTHORIZED', '認証が必要です');
  }
  const email = claimString(claims, 'email') ?? null;
  const nameClaim = claimString(claims, 'name');

  const tableName = process.env.MAIN_TABLE ?? '';
  const key = { PK: `USER#${userId}`, SK: 'PROFILE' };

  const existing = await ddbDocClient.send(new GetCommand({ TableName: tableName, Key: key }));

  let profile: UserProfile;
  if (existing.Item) {
    profile = toProfile(userId, existing.Item);
  } else {
    const createdAt = new Date().toISOString();
    const displayName = nameClaim || email?.split('@')[0] || 'ユーザー';
    profile = { userId, displayName, status: 'active', createdAt };
    try {
      await ddbDocClient.send(
        new PutCommand({
          TableName: tableName,
          Item: { ...key, ...profile },
          ConditionExpression: 'attribute_not_exists(PK)',
        }),
      );
    } catch (err) {
      if (!(err instanceof ConditionalCheckFailedException)) {
        throw err;
      }
      // 並行リクエストが先に作成済み。作成済みの内容を取り直す
      const retry = await ddbDocClient.send(new GetCommand({ TableName: tableName, Key: key }));
      if (!retry.Item) {
        throw err;
      }
      profile = toProfile(userId, retry.Item);
    }
  }

  return c.json({ ...profile, email });
});
