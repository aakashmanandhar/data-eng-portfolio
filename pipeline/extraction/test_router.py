import sys
sys.path.insert(0, '/app')
import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rag.services import classify_question, answer_analytics_question

question = "What's the average senior salary in Germany?"
print(f"Classification: {classify_question(question)}")

result = answer_analytics_question(question)
print(f"SQL: {result['sql']}")
print(f"Answer: {result['answer']}")