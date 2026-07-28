import vertexai
import os
from dotenv import load_dotenv

load_dotenv()

def init_vertex():
    vertexai.init(
        project_id=os.getenv("GOOGLE_CLOUD_PROJECT"),
        location=os.getenv("GOOGLE_CLOUD_LOCATION")
    )