# Getting started

## Requirements and installation

Use Python 3.10 or later. The SDK uses only the Python standard library.
From the repository root, install the package with:

```text
pip install ./sdk/python
```

Start and configure the Prajapatt API separately. Supply a server-issued API
key to trusted Python code; never commit it or expose it in a browser or public
mobile application.

## Create a client

```python
import os

from prajapatt_sdk import PrajapattClient

client = PrajapattClient(
    api_key=os.environ["PRAJAPATT_API_KEY"],
    base_url="http://127.0.0.1:8000",
    timeout=60.0,
)
```

`base_url` defaults to `http://127.0.0.1:8000`; `timeout` defaults to 60
seconds. Use HTTPS when connecting to a remote server.

## Check the API and select a model

The health endpoint is unauthenticated. Model listing requires the API key:

```python
health = client.health()
models = client.list_models()
model_id = models[0]["id"] if models else "prajapatt-1"
print(health["status"], model_id)
```

## Send a chat request

Messages use `system`, `user`, or `assistant` roles and non-empty text content.
The final message must be from the user.

```python
completion = client.chat(
    [
        {"role": "system", "content": "Answer clearly and briefly."},
        {"role": "user", "content": "What is a transformer model?"},
    ],
    model=model_id,
    session_id="optional-conversation-id",
)
print(completion.choices[0].message.content)
```

`session_id` is optional and allows the server to associate requests with the
same conversation session. The API scopes memory to the authenticated key's
subject; the SDK does not accept a client-supplied user identity.

## Stream response text

```python
for text in client.stream_chat(
    [{"role": "user", "content": "Explain attention in one paragraph."}],
    model=model_id,
):
    print(text, end="", flush=True)
```

The current server computes the full answer before delivering SSE chunks.
Streaming changes how the response is transported, not how quickly tokens are
generated.

## Run SDK tests

From `sdk/python`, run:

```text
python -m unittest discover -s tests
```
