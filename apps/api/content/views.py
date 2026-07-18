from rest_framework import generics
from .models import CaseStudy
from .serializers import CaseStudySerializer


class CaseStudyListView(generics.ListAPIView):
    serializer_class = CaseStudySerializer

    def get_queryset(self):
        return CaseStudy.objects.filter(is_published=True)