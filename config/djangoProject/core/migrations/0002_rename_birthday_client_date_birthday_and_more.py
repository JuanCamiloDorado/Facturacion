# Generated by Django 5.1 on 2024-09-10 16:36

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.RenameField(
            model_name='client',
            old_name='birthday',
            new_name='date_birthday',
        ),
        migrations.RenameField(
            model_name='client',
            old_name='sexo',
            new_name='gender',
        ),
    ]
