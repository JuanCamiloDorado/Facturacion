# Generated by Django 5.1 on 2024-09-01 05:07

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0008_client_alter_category_name_product_sale_detsale_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='category',
            name='desc',
            field=models.CharField(blank=True, max_length=500, null=True, verbose_name='Descripción'),
        ),
    ]
