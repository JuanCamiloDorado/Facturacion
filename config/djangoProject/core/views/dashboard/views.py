from django.utils.dateparse import datetime_re
from django.views.generic import TemplateView
from datetime import datetime
from core.models import Sale
from django.db.models.functions import Coalesce
from django.db.models import Sum, DecimalField

class DashboardView(TemplateView):
    template_name = 'dashboard.html'

    def get_graph_sales_year_month(self):
        data = []
        try:
            year = datetime.now().year
            for m in range(1,13):
                total = Sale.objects.filter(date_joined__year=year, date_joined__month=m).aggregate(r=Coalesce(Sum('total'),0,output_field=DecimalField())).get('r')
                data.append(float(total))
        except:
            pass
        return data
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['panel'] = 'Panel de administrador'
        context['graph_sales_year_month'] = self.get_graph_sales_year_month()
        return context