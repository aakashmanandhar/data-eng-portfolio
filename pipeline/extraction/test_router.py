import sys
sys.path.insert(0, '/app')
import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rag.services import classify_question

test_questions = [
    "What's the average senior salary in Germany?",
    "What stack did you use for the SAP pipeline?",
    "What are the top tools used in the USA?",
    "How does the RAG assistant work?",
]

for q in test_questions:
    print(f"{q!r} -> {classify_question(q)}")