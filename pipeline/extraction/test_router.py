import sys
sys.path.insert(0, '/app')
import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rag.services import classify_question, answer_analytics_question, answer_project_question

question = "What was the biggest bug you had to solve in the German Car Market project?"
print(f"Classification: {classify_question(question)}")

result = answer_project_question(question)
print(f"\nAnswer: {result['answer']}")
print(f"\nSources: {result['sources']}")