import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

// singleton pattern for Secret Manager client
let client;

export async function getSecret(secretName) {
  // initialize client if it doesn't exist.
  if (!client) {
    client = new SecretManagerServiceClient();
  }
  // allow overriding the project ID if secrets are located in a different GCP project
  const projectId =
    process.env.SECRETS_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) {
    // throw an error if the project ID is not set, since it is required to access secrets
    throw new Error(
      'Neither SECRETS_PROJECT_ID nor GOOGLE_CLOUD_PROJECT environment variable is set.',
    );
  }

  const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;

  const [response] = await client.accessSecretVersion({ name });
  return response.payload.data.toString('utf8');
}

// load all required secrets into process.env
export async function loadSecrets() {
  if (process.env.NODE_ENV === 'production' || process.env.GAE_ENV) {
    process.env.PGSQL_DB_NAME = await getSecret('PGSQL_DB_NAME');
    process.env.PGSQL_DB_USER = await getSecret('PGSQL_DB_USER');
    process.env.PGSQL_DB_PASSWORD = await getSecret('PGSQL_DB_PASSWORD');
    process.env.JWT_SECRET = await getSecret('JWT_SECRET');
    process.env.CORS_ORIGIN = await getSecret('CORS_ORIGIN');
    process.env.SMTP_HOST = await getSecret('SMTP_HOST');
    process.env.SMTP_PORT = await getSecret('SMTP_PORT');
    process.env.SMTP_USER = await getSecret('SMTP_USER');
    process.env.SMTP_PASSWORD = await getSecret('SMTP_PASSWORD');
    console.log('Secret loaded from Google Secret Manager.');
  } else {
    console.log('Using local .env file for secrets.');
  }
}
