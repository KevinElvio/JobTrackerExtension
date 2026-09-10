from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    GOOGLE_SPREADSHEET_ID: str
    GOOGLE_SERVICE_ACCOUNT_EMAIL: str
    GOOGLE_PRIVATE_KEY: str
    API_TOKEN: str

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
