# Register your models here.
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from core.user.models import User


class UserAdmin(BaseUserAdmin):
    def get_fieldsets(self, request, obj=None):
        fieldsets = list(super().get_fieldsets(request, obj))
        fieldsets.append(('Image',{'fields': ('image',)}))
        return fieldsets

admin.site.register(User, UserAdmin)

