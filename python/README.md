# Prajapatt Python SDK

Install from the repository root with `pip install ./sdk/python`. The package
uses only the Python standard library.

```python
from prajapatt_sdk import PrajapattClient

client = PrajapattClient(
    base_url="http://127.0.0.1:8000",
    api_key="your-server-issued-api-key",
)

models = client.list_models()
completion = client.chat(
    [{"role": "user", "content": "Hello"}],
    model=models[0]["id"],
)
print(completion.choices[0].message.content)
```

Call `client.stream_chat(messages)` to iterate over text chunks. Use a separate
server-issued key for each customer. Never put a private API key in a
browser/mobile client.

More detail: [SDK documentation](docs/README.md), [getting started](docs/getting-started.md),
and [API reference](docs/api-reference.md).
