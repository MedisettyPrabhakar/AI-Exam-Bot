from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from dotenv import load_dotenv
import os
import google.generativeai as genai
import json
import re
import random

app = Flask(__name__)
CORS(app)
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))


# 🔐 Replace with your actual Gemini API key
#genai.configure(api_key="GEMINI_API_KEY")  # Replace with your actual key

# Use Gemini 1.5 Flash
model = genai.GenerativeModel("models/gemini-1.5-flash")


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api", methods=["POST"])
def generate_quiz():
    data = request.get_json()
    topic = data.get("topic", "")
    count = int(data.get("count", 10))

    seed = random.randint(1000, 9999)

    prompt = (
        f"Generate {count} unique multiple-choice questions (MCQs) on the topic '{topic}'. "
        f"Vary difficulty and phrasing. Ensure different questions each time. Seed: {seed}. "
        "Return only raw JSON in this exact format with no explanation or markdown:\n"
        "[\n"
        "{\n"
        '  "question": "What is ...?",\n'
        '  "options": ["Option A", "Option B", "Option C", "Option D"],\n'
        '  "answer": "A"\n'
        "},\n"
        "...]\n"
    )

    try:
        response = model.generate_content(prompt)
        raw_text = response.text.strip()

        # 🧼 Remove ```json ``` if Gemini adds it
        cleaned_text = re.sub(r"```json|```", "", raw_text).strip()

        quiz_json = json.loads(cleaned_text)
        random.shuffle(quiz_json)  # 🌀 Shuffle for variety

        # ✅ Validate the structure
        valid = (
            isinstance(quiz_json, list)
            and all("question" in q and "options" in q and "answer" in q for q in quiz_json)
        )

        if not valid:
            return jsonify({"output": [], "error": "Invalid format returned from Gemini."})

        # ✅ Sanitize answers to A/B/C/D format
        for q in quiz_json:
            q["answer"] = re.sub(r"(?i)answer[:\-]?\s*", "", q["answer"]).strip().upper()

        return jsonify({"output": quiz_json})

    except Exception as e:
        return jsonify({"output": [], "error": str(e)})


if __name__ == "__main__":
    app.run(debug=True)
