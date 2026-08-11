import { describe, expect, it } from 'vitest';
import { uploadedImageSchema } from '@oriorimap/shared';

const validImage = {
  imageId: 'img-001',
  ownerId: 'user-001',
  kind: 'icon',
  s3Key: 'uploads/img-001.png',
  status: 'pending',
  createdAt: '2026-08-12T00:00:00.000Z',
};

describe('uploadedImageSchema', () => {
  it('妥当なUploadedImageを受理する', () => {
    const result = uploadedImageSchema.safeParse(validImage);
    expect(result.success).toBe(true);
  });

  it('kind=photoのUploadedImageを受理する', () => {
    const result = uploadedImageSchema.safeParse({ ...validImage, kind: 'photo' });
    expect(result.success).toBe(true);
  });

  it('kindがicon/photo以外の場合は失敗する', () => {
    const result = uploadedImageSchema.safeParse({ ...validImage, kind: 'video' });
    expect(result.success).toBe(false);
  });

  it('statusがpending/validated/attached/pending_delete以外の場合は失敗する', () => {
    const result = uploadedImageSchema.safeParse({ ...validImage, status: 'unknown' });
    expect(result.success).toBe(false);
  });
});
