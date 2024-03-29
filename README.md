# Utilities

[![npm](https://img.shields.io/npm/v/@kaciras/utilities)](https://www.npmjs.com/package/@kaciras/utilities)
![npm type definitions](https://img.shields.io/npm/types/%40kaciras%2Futilities)
[![Test](https://github.com/Kaciras/utilities/actions/workflows/test.yml/badge.svg)](https://github.com/Kaciras/utilities/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/Kaciras/utilities/branch/master/graph/badge.svg?token=LVN4Y86T39)](https://codecov.io/gh/Kaciras/utilities)

A set of common JS functions for Node and browser.

Goals:

* Just work for most cases, not a general framework.
* No dependencies.
* High performance & less code.
* Write with latest ECMAScript.
* Tree-shakeable.
* No duplicated with FP libraries (lodash, underscore, etc.)
* Type-first, We don't check for parameters that don't match the type.

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

Run tests. Some tests are for generated bundles, you should build them first.

```
pnpm run test:unit
pnpm run test:browser
pnpm run test:types
```
