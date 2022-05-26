# Utilities

![npm](https://img.shields.io/npm/v/@kaciras/utilities)
[![Test](https://github.com/Kaciras/utilities/actions/workflows/test.yml/badge.svg)](https://github.com/Kaciras/utilities/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/Kaciras/utilities/branch/master/graph/badge.svg?token=LVN4Y86T39)](https://codecov.io/gh/Kaciras/utilities)

A set of common JS functions for node and browser.

## Install

This package is pure ESM, It cannot be `require()`'d from CommonJS.

```
pnpm i @kaciras/utilities
```

## Environment detection

@kaciras/utilities use `typeof window === "undefined"` to detect whether it is running in the browser or Node, 
