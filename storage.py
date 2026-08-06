import json
import tempfile

from google.cloud import storage
from google.oauth2 import service_account
import os
from dotenv import load_dotenv

load_dotenv()

GCS_BUCKET_VAULT = os.getenv("GCS_BUCKET_VAULT")
GCS_BUCKET_AGENT = os.getenv("GCS_BUCKET_AGENT")
GCS_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON")

if GCS_CREDENTIALS:
    info = json.loads(GCS_CREDENTIALS)
    credentials = service_account.Credentials.from_service_account_info(info)
    client = storage.Client(credentials=credentials)

    # google-genai (Vertex AI mode) authenticates via Application Default
    # Credentials, a lookup path separate from the manual client above — it
    # needs GOOGLE_APPLICATION_CREDENTIALS pointing at a file on disk, not
    # inline JSON, and there's no GCP metadata server on Render to fall
    # back on. Materialize one file from the same secret so both work.
    if not os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
        cred_file = tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False)
        cred_file.write(GCS_CREDENTIALS)
        cred_file.close()
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = cred_file.name
else:
    # cloud deployment would use attached service account
    credentials = None
    client = storage.Client()

def upload_file(
    contents: bytes,
    destination_path: str,
    bucket_name: str,
    content_type: str = "application/octet-stream"
) -> str:
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(destination_path)
    blob.upload_from_string(contents, content_type=content_type)
    return destination_path

def get_signed_url(
        gcs_path: str,
        bucket_name: str,
        expiration_minutes: int = 60
) -> str:
    from datetime import timedelta
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(gcs_path)
    url = blob.generate_signed_url(
        expiration=timedelta(minutes=expiration_minutes),
        method="GET",
        credentials=credentials
    )
    return url

def delete_file(gcs_path: str, bucket_name: str):
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(gcs_path)
    blob.delete()

def download_text(gcs_path: str, bucket_name: str) -> str:
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(gcs_path)
    return blob.download_as_text()