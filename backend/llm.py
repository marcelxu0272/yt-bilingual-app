"""DeepSeek OpenAI-compatible client shared by translation and dictionary."""
import json
import os

from openai import AsyncOpenAI


def _client() -> AsyncOpenAI:
    api_key = os.environ.get("DEEPSEEK_API_KEY", "").strip()
    if not api_key or api_key == "your_deepseek_api_key_here":
        raise RuntimeError("未配置 DEEPSEEK_API_KEY，请在项目根目录 .env 中填入。")
    base_url = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com").rstrip("/")
    return AsyncOpenAI(api_key=api_key, base_url=base_url)


async def chat_text(prompt: str, model: str) -> str:
    response = await _client().chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
    )
    content = response.choices[0].message.content if response.choices else None
    if not content:
        raise ValueError("DeepSeek 返回了空内容。")
    return content


async def chat_json(prompt: str, model: str):
    response = await _client().chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
    )
    content = response.choices[0].message.content if response.choices else None
    if not content:
        raise ValueError("DeepSeek 返回了空 JSON 内容。")
    return json.loads(content)
