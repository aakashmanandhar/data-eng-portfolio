from rest_framework.views import APIView
from rest_framework.response import Response
from .services import classify_question, answer_analytics_question, answer_project_question


class AskView(APIView):
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