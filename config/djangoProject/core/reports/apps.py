from django.apps import AppConfig

from core import reports


class ReportsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core.reports'
