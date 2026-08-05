import json

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
    from google.oauth2 import service_account
    credentials = service_account.Credentials.from_service_account_info(info)
    client = storage.Client(credentials=credentials)
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