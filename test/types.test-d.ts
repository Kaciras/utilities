/* eslint-disable @typescript-eslint/ban-types */

import { expectAssignable } from "tsd-lite";
import { Awaitable } from "../src/lang.js";

expectAssignable<Awaitable<number>>(11);
expectAssignable<Awaitable<number>>(Promise.resolve(11));
