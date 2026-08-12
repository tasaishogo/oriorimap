import { Amplify } from 'aws-amplify';

// SRP認証（design §4.3）。パスワードはネットワークに送出されず、
// ブラウザから cognito-idp.<region>.amazonaws.com へ直接通信する。
export function configureAmplify(): void {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
        userPoolClientId: import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID,
      },
    },
  });
}
