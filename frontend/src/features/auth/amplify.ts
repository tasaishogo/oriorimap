import { Amplify } from 'aws-amplify';

// SRP認証（design §4.3）。パスワードはネットワークに送出されず、
// ブラウザから cognito-idp.<region>.amazonaws.com へ直接通信する。
// Google連携（T013）はCognitoドメイン経由のOAuthリダイレクトのため、
// loginWith.oauthの設定が別途必要（signInWithRedirectはこの設定を前提とする）。
export function configureAmplify(): void {
  const domain = import.meta.env.VITE_COGNITO_DOMAIN;
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
        userPoolClientId: import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID,
        loginWith: {
          oauth: {
            domain,
            scopes: ['openid', 'email', 'profile'],
            redirectSignIn: [`${window.location.origin}/`],
            redirectSignOut: [`${window.location.origin}/`],
            responseType: 'code',
          },
        },
      },
    },
  });
}
