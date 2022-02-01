# OpenAPI Extensions

This document describes the [OpenAPI extensions](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.3.md#specification-extensions) used in Pinterest's REST API OpenAPI descriptions.

## `x-ratelimit-category`

### Purpose

Defines a functional category used for [rate limiting](https://developers.pinterest.com/docs/api/v5/#tag/Rate-limits).

### Usage

`x-ratelimit-category` should be applied to each operation. Operations that share a rate limit category will share rate limit quota.

The value should be a string.

#### Example usage

```yml
  /user_account:
    get:
      summary: Get user account
      tags:
      - user_account
      operationId: user_account/get
      x-ratelimit-category: basic_org_read
```