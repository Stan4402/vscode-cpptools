/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All Rights Reserved.
 * See 'LICENSE' in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

/* eslint @typescript-eslint/no-var-requires: "off" */

export interface PerfMessage<TInput = Record<string, any> | undefined> {
    /** this is the 'name' of the event */
    name: string;

    /** this indicates the context or origin of the message  */
    context: Record<string, string | Set<string>>;

    /** if the message contains complex data, it should be in here */
    data?: TInput;

    /** if the message is just a text message, this is the contents of the message  */
    text?: string;

    /** the message can have a numeric value that indicates the 'level' or 'severity' etc */
    level?: number;
}

const services = {
    instrument: <T extends Record<string, any>>(instance: T, _options?: { ignore?: string[]; name?: string }): T => instance,
    message: (_message: PerfMessage) => { },
    init: (_vscode: any) => { },
    launchSettings: undefined as Record<string, any> | undefined
};

/** Adds instrumentation to all the members of an object when instrumentation is enabled  */
export function instrument<T extends Record<string, any>>(instance: T, options?: { ignore?: string[]; name?: string }): T {
    return services.instrument(instance, options);
}

/** sends a perf message to the monitor */
export function sendInstrumentation(message: PerfMessage): void {
    services.message(message);
}

/** verifies that the instrumentation is loaded into the global namespace */
export function isInstrumentationEnabled(): boolean {
    return !!(global as any).instrumentation;
}

// if the instrumentation code is not globally loaded *yet*, then load it now.
if (!isInstrumentationEnabled()) {
    // pull the launch settings from the environment if the variable has been set.
    if (services.launchSettings === undefined) {
        services.launchSettings = process.env.PERFECTO_LAUNCH_SETTINGS ? JSON.parse(process.env.PERFECTO_LAUNCH_SETTINGS) as Record<string, any> : { tests: [], collector: undefined };
    }

    // this loads the bootstrap module (global-instrumentation-support) which adds some global functions.
    if (services.launchSettings?.bootstrapModule) {
        // work around for webpack to load the bootstrap module.
        /* eslint no-eval: "off"  */
        eval(`require`)(services.launchSettings.bootstrapModule);
    }
}

// If the instrumentation object was *actually* loaded then we can set the services from the global object.
// Having this separate ensures that this module is wired up to the global object.
// It's not included in the previous block because if something else loads the instrumentation code first
// this is still needed so that *this* module is properly connected to the global object.
if (isInstrumentationEnabled()) {
    // instrumentation services provided by the tool
    services.instrument = (global as any).instrumentation.instrument;
    services.message = (global as any).instrumentation.message;
    services.init = (global as any).instrumentation.init;

    services.init(require('vscode'));
}

(globalThis as any)["_vscode_"] = require('vscode');
