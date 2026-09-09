# SynthGraph SDK Contract

## Contract Authority
The actual SDK source code and current SDK context are the primary authority for current wire behavior.

The backend must preserve the established public SDK contract unless an explicit contract change is made. Do not silently change endpoint paths, request fields, response fields, or lifecycle semantics.

## SDK Architecture
The Python SDK provides a client-oriented interface over HTTPS/JSON.

Core areas include:
- client configuration
- authentication
- HTTP transport
- projects
- experiments
- generations
- generation lifecycle
- validation and error handling

The SDK lets researchers record provenance from existing Python workflows.

## Generation Contract
The current SDK contract includes Generation operations for:
- create
- get
- list
- start
- complete
- fail

Expected generation lifecycle statuses:
- `pending`
- `running`
- `completed`
- `failed`

The generation contract includes provenance/configuration information as defined by the current SDK source.

## Important Endpoint Rule
Before implementing or changing a route, inspect the actual SDK source and current backend routes. If a mismatch exists, explicitly identify it rather than silently changing one side.

## Validation
SDK models use typed validation. The backend must independently validate and authorize requests. Client-side validation is not a security boundary.

## HTTP Behavior
The SDK uses a shared HTTP client and consistent error handling. Backend errors should remain predictable and machine-readable enough for the SDK to handle them consistently.

## Naming
Python model fields use the SDK's canonical Python naming conventions. Backend TypeScript/JSON naming must be reconciled deliberately with the established wire contract rather than assuming database column names are the API contract.

## Compatibility Rule
The SDK is a public client contract. When implementing backend functionality:
1. inspect actual SDK source
2. identify exact request/response shape
3. compare with backend
4. resolve mismatches explicitly
5. avoid breaking existing SDK behavior accidentally
