from django.urls import path
from core.views.category.views import *
from core.views.dashboard.views import DashboardView
from core.views.product.views import *

app_name = 'core'

urlpatterns = [
    #URLS DE CATEGORIA
    path('category/list/', CategoryListView.as_view(), name='category_list'),
    path('category/add/', CategoryCreateView.as_view(), name='category_create'),
    path('category/update/<int:pk>/', CategoryUpdateView.as_view(), name='category_update'),
    path('category/delete/<int:pk>/', CategoryDeleteView.as_view(), name='category_delete'),
    path('category/form/', CategoryFormView.as_view(), name='category_form'),

    #URLS DEL PRODUCTO
    path('product/list/', ProductListView.as_view(), name='product_list'),
    path('product/add/', ProductCreateView.as_view(), name='product_create'),
    path('product/update/<int:pk>/', ProductUpdateView.as_view(), name='product_update'),
    path('product/delete/<int:pk>/', ProductDeleteView.as_view(), name='product_delete'),


    #URL HOME VISTA PRINCIPAL
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
]