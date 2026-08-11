import { beforeEach, describe, expect, it } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { ddbDocClient } from '../../src/lib/dynamodb';

const ddbMock = mockClient(ddbDocClient);

describe('ddbDocClient', () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  it('GetCommandをモックした戻り値がそのままsendの結果になる', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: { PK: 'USER#user-001', SK: 'PROFILE', displayName: '花子' },
    });

    const result = await ddbDocClient.send(
      new GetCommand({
        TableName: 'oriorimap-main',
        Key: { PK: 'USER#user-001', SK: 'PROFILE' },
      }),
    );

    expect(result.Item).toEqual({ PK: 'USER#user-001', SK: 'PROFILE', displayName: '花子' });
  });
});
