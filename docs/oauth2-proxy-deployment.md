# OAuth2 Proxy + Google SSO Deployment Runbook

This is the step-by-step setup for the Google SSO flow (OAuth2 Proxy in front of the
app, deployed as a two-container Cloud Run service). See [deploy/service.yaml](../deploy/service.yaml),
[docker-compose.yml](../docker-compose.yml), and [Dockerfile](../Dockerfile) for
the actual config this runbook sets up. Unless noted otherwise, run the commands
below from this project's root (`personal-blog-server/`).

## 1. Create a Google OAuth 2.0 Client ID

1. Go to [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials).
2. If you haven't already, configure the **OAuth consent screen** (External user type
   is fine for a personal project; you don't need to submit it for verification
   since only your own email will ever be authorized to sign in).
3. Click **Create Credentials → OAuth client ID**.
4. Application type: **Web application**.
5. **Authorized redirect URIs** — add both of these (you'll have the real Cloud Run
   URL only after the first deploy; see step 5):
   - `http://localhost:4180/oauth2/callback` (local docker-compose testing)
   - `https://YOUR_CLOUD_RUN_URL/oauth2/callback` (placeholder — update after step 5)
6. Save the generated **Client ID** and **Client Secret** — you'll need both below.

## 2. Store secrets

### Local (docker-compose)

```bash
cp .env.oauth2-proxy.example .env.oauth2-proxy
```

Fill in `OAUTH2_PROXY_CLIENT_ID` and `OAUTH2_PROXY_CLIENT_SECRET` from step 1, and
generate a cookie secret:

```bash
python3 -c 'import os,base64; print(base64.urlsafe_b64encode(os.urandom(32)).decode())'
```

### Production (Google Secret Manager)

```bash
printf '%s' 'YOUR_CLIENT_SECRET' | gcloud secrets create oauth2-proxy-client-secret --data-file=-
python3 -c 'import os,base64; print(base64.urlsafe_b64encode(os.urandom(32)).decode())' \
  | gcloud secrets create oauth2-proxy-cookie-secret --data-file=-
gcloud secrets create oauth2-proxy-authenticated-emails \
  --data-file=oauth2-proxy/authenticated-emails.txt

# the app itself also enforces this allowlist independently of OAuth2 Proxy (see
# ALLOWED_EMAILS in auth.controller.js) — loaded automatically by secrets.js,
# alongside JWT_SECRET/CORS_ORIGIN/PGSQL_*, no service.yaml wiring needed
printf '%s' 'gcwiley@gmail.com' | gcloud secrets create ALLOWED_EMAILS --data-file=-
```

Grant the Cloud Run service's runtime service account access to these secrets (and
to Cloud SQL, if not already granted):

```bash
PROJECT_NUMBER=$(gcloud projects describe PROJECT_ID --format='value(projectNumber)')
RUNTIME_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" # or your custom runtime SA

for secret in oauth2-proxy-client-secret oauth2-proxy-cookie-secret oauth2-proxy-authenticated-emails ALLOWED_EMAILS; do
  gcloud secrets add-iam-policy-binding "$secret" \
    --member="serviceAccount:${RUNTIME_SA}" \
    --role="roles/secretmanager.secretAccessor"
done

gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/cloudsql.client"
```

## 3. Create an Artifact Registry repository (one-time)

```bash
gcloud artifacts repositories create personal-blog \
  --repository-format=docker \
  --location=us-east4
```

## 4. Fill in the remaining placeholders

In [deploy/service.yaml](../deploy/service.yaml), replace:

- `PROJECT_ID:REGION:INSTANCE_NAME` (both occurrences) — your Cloud SQL instance
  connection name (`gcloud sql instances describe INSTANCE --format='value(connectionName)'`)
- `PROJECT_ID` — your GCP project ID
- `YOUR_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com` — the Client ID from step 1
- `YOUR_CLOUD_RUN_URL` — leave as-is for the very first deploy (step 5 below); you'll
  update it once you know the real URL

## 5. First deploy

```bash
# this command must run from the REPO ROOT (one level up from this project) —
# Cloud Build needs to see personal-blog-client/ source to build it in step 1, even
# though the Docker image itself only ever packages personal-blog-server/ (step 2
# onward), exactly like your local workflow
cd ..
gcloud builds submit --region=us-east4 \
  --config=personal-blog-server/cloudbuild.yaml .
```

This first deploy's `--redirect-url` won't match yet, so sign-in will fail — that's
expected. Get the assigned URL:

```bash
gcloud run services describe personal-blog --region=us-east4 --format='value(status.url)'
```

Then:

1. Add `https://<that-url>/oauth2/callback` as an authorized redirect URI on the
   Google OAuth Client (step 1) — replacing the placeholder.
2. Update `--redirect-url`, `CORS_ORIGIN` (via the `CORS_ORIGIN` Secret Manager
   secret, not the manifest — see [secrets.js](../src/secrets.js)), and any other
   `YOUR_CLOUD_RUN_URL` placeholders in `deploy/service.yaml`.
3. Re-run the `gcloud builds submit` command above (from the repo root).

If you add a custom domain later (see the "connect to a domain name" entry in
[tasks.md](../tasks.md)), map it to this Cloud Run service and update the redirect
URI/placeholders again — the flow doesn't otherwise change.

## 6. Local testing (docker-compose)

```bash
# 1. build the client first — the Dockerfile does not do this for you
cd ../personal-blog-client && npm run build-move

# 2. from personal-blog-server/
cd ../personal-blog-server
docker compose up --build
```

Visit **http://localhost:4180** (not :3000 — that bypasses OAuth2 Proxy entirely).
Only the email(s) listed in
[oauth2-proxy/authenticated-emails.txt](../oauth2-proxy/authenticated-emails.txt)
can complete sign-in.

## 7. Managing who can sign in

Edit [oauth2-proxy/authenticated-emails.txt](../oauth2-proxy/authenticated-emails.txt)
(one email per line) for local testing. For production, update the
`oauth2-proxy-authenticated-emails` secret:

```bash
gcloud secrets versions add oauth2-proxy-authenticated-emails \
  --data-file=oauth2-proxy/authenticated-emails.txt
```

Then redeploy (step 5) so the new secret version is mounted.
