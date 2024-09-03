from djangoProject.wsgi import *
from core.models import *
#cargamos los datos a la tabla productos
data = ['Lacteos', 'Carnes, pescados y huevos', 'Papas, legumbres, frutos secos', 'Verduras', 'Frutas', 'Cereales y derivados',
        'Azúcar y dulces', 'Grasas, aceite y mantequilla']

for i in data:
    cat = Category(name=i)
    cat.save()
    print('Guardado registro N°{}'.format(cat.id))

#delete from public.core_category;
#ALTER SEQUENCE core_category_id_seq RESTART WITH 1;