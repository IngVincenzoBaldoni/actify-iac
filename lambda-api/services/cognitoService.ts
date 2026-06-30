import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminGetUserCommand,
  AdminUpdateUserAttributesCommand,
  AdminSetUserPasswordCommand,
  MessageActionType,
} from '@aws-sdk/client-cognito-identity-provider';

const cognito = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION ?? 'eu-central-1' });
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;

export async function adminCreateUser(params: {
  email: string;
  password?: string;
  companyId: string;
  role: 'admin' | 'collaborator' | 'partner';
  suppressEmail?: boolean;
}) {
  const cmd = new AdminCreateUserCommand({
    UserPoolId: USER_POOL_ID,
    Username: params.email,
    TemporaryPassword: params.password ?? generateTempPassword(),
    MessageAction: params.suppressEmail ? MessageActionType.SUPPRESS : undefined,
    UserAttributes: [
      { Name: 'email', Value: params.email },
      { Name: 'email_verified', Value: 'true' },
      { Name: 'custom:company_id', Value: params.companyId },
      { Name: 'custom:role', Value: params.role === 'collaborator' ? 'member' : params.role },
    ],
  });
  return cognito.send(cmd);
}

export async function adminSetPermanentPassword(email: string, password: string) {
  await cognito.send(new AdminSetUserPasswordCommand({
    UserPoolId: USER_POOL_ID,
    Username: email,
    Password: password,
    Permanent: true,
  }));
}

export async function adminGetUser(email: string) {
  try {
    const r = await cognito.send(new AdminGetUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
    }));
    return r;
  } catch (err: unknown) {
    if ((err as { name?: string }).name === 'UserNotFoundException') return null;
    throw err;
  }
}

export async function adminDeleteUser(email: string) {
  await cognito.send(new AdminDeleteUserCommand({
    UserPoolId: USER_POOL_ID,
    Username: email,
  }));
}

export async function adminUpdateUserRole(email: string, role: 'admin' | 'collaborator') {
  await cognito.send(new AdminUpdateUserAttributesCommand({
    UserPoolId: USER_POOL_ID,
    Username: email,
    UserAttributes: [{ Name: 'custom:role', Value: role === 'collaborator' ? 'member' : role }],
  }));
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let pass = 'Actify1!';
  for (let i = 0; i < 8; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)];
  }
  return pass;
}
