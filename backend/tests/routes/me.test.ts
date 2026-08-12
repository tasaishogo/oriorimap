import { beforeEach, describe, expect, it } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { app } from '../../src/app';
import { ddbDocClient } from '../../src/lib/dynamodb';

const ddbMock = mockClient(ddbDocClient);

function requestMe(claims?: Record<string, string>) {
  return app.request(
    '/api/me',
    {},
    {
      requestContext: claims ? { authorizer: { jwt: { claims } } } : undefined,
    },
  );
}

describe('GET /api/me', () => {
  beforeEach(() => {
    ddbMock.reset();
    process.env.MAIN_TABLE = 'oriorimap-test-main';
  });

  it('JWTクレームが無い場合は401・code:UNAUTHORIZEDを返す', async () => {
    const res = await requestMe(undefined);
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('初回アクセス時はUserプロフィールをDynamoDBに作成し、nameクレームをdisplayNameとして返す', async () => {
    ddbMock.on(GetCommand).resolvesOnce({});
    ddbMock.on(PutCommand).resolves({});

    const res = await requestMe({ sub: 'user-001', email: 'hanako@example.com', name: '花子' });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      userId: 'user-001',
      displayName: '花子',
      status: 'active',
      email: 'hanako@example.com',
    });

    const putCalls = ddbMock.commandCalls(PutCommand);
    expect(putCalls).toHaveLength(1);
    expect(putCalls[0].args[0].input.Item).toMatchObject({
      PK: 'USER#user-001',
      SK: 'PROFILE',
      displayName: '花子',
    });
  });

  it('nameクレームが無い場合はメールのローカル部をdisplayNameにする', async () => {
    ddbMock.on(GetCommand).resolvesOnce({});
    ddbMock.on(PutCommand).resolves({});

    const res = await requestMe({ sub: 'user-002', email: 'taro@example.com' });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ displayName: 'taro' });
  });

  it('既存プロフィールがある場合は作成せずそのまま返す', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        PK: 'USER#user-003',
        SK: 'PROFILE',
        displayName: '既存花子',
        status: 'active',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    });

    const res = await requestMe({ sub: 'user-003', email: 'existing@example.com' });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      userId: 'user-003',
      displayName: '既存花子',
      createdAt: '2026-01-01T00:00:00.000Z',
      email: 'existing@example.com',
    });
    expect(ddbMock.commandCalls(PutCommand)).toHaveLength(0);
  });

  it('並行作成でConditionalCheckFailedExceptionが発生した場合は作成済みの内容を取り直して返す', async () => {
    ddbMock
      .on(GetCommand)
      .resolvesOnce({})
      .resolvesOnce({
        Item: {
          PK: 'USER#user-004',
          SK: 'PROFILE',
          displayName: '先勝ち花子',
          status: 'active',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      });
    ddbMock.on(PutCommand).rejects(
      new ConditionalCheckFailedException({
        message: 'The conditional request failed',
        $metadata: {},
      }),
    );

    const res = await requestMe({ sub: 'user-004', email: 'race@example.com' });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ displayName: '先勝ち花子' });
  });
});
