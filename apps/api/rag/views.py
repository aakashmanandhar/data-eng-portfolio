from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.authentication import SessionAuthentication
from .services import classify_question, answer_analytics_question, answer_project_question


class CsrfExemptSessionAuthentication(SessionAuthentication):
    def enforce_csrf(self, request):
        return  # skip CSRF check entirely for this public endpoint


class AskView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [AllowAny]

    def post(self, request):
        question = request.data.get('question', '').strip()

        if not question:
            return Response({"error": "No question provided."}, status=400)

        classification = classify_question(question)

        if classification == 'analytics':
            result = answer_analytics_question(question)
        else:
            result = answer_project_question(question)

        return Response({
            "question": question,
            "classification": classification,
            **result
        })