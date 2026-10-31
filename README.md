# @lp-labs/react-storage

Schema-validated persisted React state with version migration and browser-tab synchronization. React 18+ peer only; TypeScript, ESM and CommonJS included.

## Installation

```sh
npm install @lp-labs/react-storage
```

## Quick Start

```jsx
import { useStorage } from '@lp-labs/react-storage';
export default function Example() {
  const counter = useStorage('example.counter', 0, {
    validate: (value) => typeof value === 'number',
  });
  return (
    <>
      <output>{counter.value}</output>
      <button onClick={() => counter.set((value) => value + 1)}>Increment</button>
      {counter.error && <p role="alert">{counter.error.message}</p>}
    </>
  );
}
```

## API

`useStorage(key,initial,{validate,version=1,migrate,storage,maxBytes=65536,listen=true})` returns `value`, `set(valueOrUpdater):boolean`, `remove():boolean`, `error` and `hydrated`. In TypeScript, validate is a type guard. The adapter implements getItem/setItem/removeItem. Version changes require migrate(value,oldVersion), then schema validation; reading migrations does not automatically overwrite the stored record. Native storage events and same-tab package events trigger revalidation. Initial values render on the server and before client hydration. `safeParseJson` is exported.

## Benefits

| Area                    | Details                                                |
| ----------------------- | ------------------------------------------------------ |
| Schema validation       | Validate stored and new data before exposing it.       |
| Version migration       | Transform older records through an explicit migration. |
| Size and structure caps | Reject oversized/deep JSON and unsafe property names.  |

## Customization

| Area      | Details                                                          |
| --------- | ---------------------------------------------------------------- |
| Schema    | Provide a type-guard validator and version.                      |
| Migration | Add a migration function for known older versions.               |
| Backend   | Supply a synchronous adapter and configure byte/listener limits. |

## Security And Limits

Keys are 1–128 word/dot/colon/hyphen characters. Records default to 64 KiB UTF-8, configurable up to 1 MiB; parsed structure is capped at 10,000 values and 20 levels. Prototype-related properties are rejected. Only JSON-compatible application data should be stored. localStorage is readable by same-origin scripts: never store access tokens, passwords or sensitive personal data. Validation is not encryption or authorization. Storage denial/quota errors are exposed; failed writes do not intentionally commit state. There is no cross-tab locking or atomic conflict-resolution protocol.

## Support

[Donate via PayPal](https://www.paypal.me/LibinPrasanth). Author: [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/).

## License

MIT License. See the packaged [LICENSE](LICENSE) file.
