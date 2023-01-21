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
* Not duplicated with FP libraries (lodash, underscore, etc.)

## Install

This package is pure ESM, It cannot be `require()`'d from CommonJS.

```
pnpm i @kaciras/utilities
```

The package has 2 entry points, "./node" for Node runtime and "./browser" for browsers. Most functions work for both, there are still a few functions that only work in specific runtime.

```javascript
// Import for Node.
import { /* ... */ } from "@kaciras/utilities/node";

// Import for browser
import { /* ... */ } from "@kaciras/utilities/browser";
```
