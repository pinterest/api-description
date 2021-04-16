# Pinterest's REST API OpenAPI Description

This repository contains [OpenAPI](https://www.openapis.org/) (version 3.0.3)
descriptions for Pinterest's REST API.

## What is OpenAPI?

From the [OpenAPI Specification](https://github.com/OAI/OpenAPI-Specification):

> The OpenAPI Specification (OAS) defines a standard, programming
> language-agnostic interface description for HTTP APIs, which allows both
> humans and computers to discover and understand the capabilities of a service
> without requiring access to source code, additional documentation, or
> inspection of network traffic. When properly defined via OpenAPI, a consumer
> can understand and interact with the remote service with a minimal amount of
> implementation logic. Similar to what interface descriptions have done for
> lower-level programming, the OpenAPI Specification removes guesswork in
> calling a service.

## Format

The OpenAPI document is distributed as a single **bundle** that uses OpenAPI
components for reuse and portability using JSON Schema references (`$ref`).
It is available in both JSON (`openapi.json`) and YAML (`openapi.yaml`).

## Contributing

Because this schema is used internally by Pinterest's API infrastructure, we
don't currently accept pull requests that directly modify the description.

## License

This repository is licensed under the [MIT license](LICENSE).
