import { useState } from 'react';
import { signInWithRedirect } from 'aws-amplify/auth';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { translateAuthError } from './errors';

// identity_providerを指定するためCognitoは自前ページを描画せず即座にGoogleへ
// 転送する（design §4.3）。成功時はページ遷移するため戻り値のハンドリングは無い。
export function GoogleSignInButton() {
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    try {
      await signInWithRedirect({ provider: 'Google' });
    } catch (err) {
      setError(translateAuthError(err));
    }
  }

  return (
    <div className="space-y-2">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="button" variant="outline" className="w-full" onClick={() => void handleClick()}>
        Googleでログイン
      </Button>
    </div>
  );
}
