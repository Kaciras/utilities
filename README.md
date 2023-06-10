# Utilities

![npm](https://img.shields.io/npm/v/@kaciras/utilities)
[![Test](https://github.com/Kaciras/utilities/actions/workflows/test.yml/badge.svg)](https://github.com/Kaciras/utilities/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/Kaciras/utilities/branch/master/graph/badge.svg?token=LVN4Y86T39)](https://codecov.io/gh/Kaciras/utilities)

A set of common JS functions for Node and browser.

Goals:

* Just work for most cases, not a general framework.
* High performance & less code.
* Write with latest ECMAScript.
* Tree-shakeable.
* No duplicated with FP libraries (lodash, underscore, etc.)

## Install

This package is pure ESM, it cannot be `require()`'d from CommonJS.

```
pnpm i @kaciras/utilities
```

The package has 2 entry points. Most functions work for both, but there are still some differences:

* `@kaciras/utilities/browser` can be imported from any environment, also have functions work with DOM.
* `@kaciras/utilities/node` have no browser-specific functions, but add utilities for Node, it can only be used in NodeJS.

```javascript
// Use in Node.
import { /* ... */ } from "@kaciras/utilities/node";

// Use in other environment.
import { /* ... */ } from "@kaciras/utilities/browser";
```

# Develop

Build the project:

```
pnpm build
```

Run tests. Some tests are for generated bundle, you should build first.

```
pnpm run test:unit
pnpm run test:types
```
