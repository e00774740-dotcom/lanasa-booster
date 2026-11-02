import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface AutoSettings {
    pauseBetween: bigint;
    shizukuActive: boolean;
    refreshRate: bigint;
    swipeDistance: bigint;
    gestureDuration: bigint;
    buttonX: bigint;
    buttonY: bigint;
    shotsPerBurst: bigint;
}
export interface Boost {
    id: bigint;
    timestamp: Timestamp;
}
export interface BoostStats {
    totalBoosts: bigint;
    powerLevel: bigint;
}
export interface Cell {
    value: Value;
    name: string;
}
export type Error_ = {
    __kind__: "FrontendOriginsNotConfigured";
    FrontendOriginsNotConfigured: null;
} | {
    __kind__: "MixedSsoSources";
    MixedSsoSources: {
        otherKeys: Array<string>;
        ssoKeys: Array<string>;
    };
} | {
    __kind__: "Stale";
    Stale: {
        ageNs: bigint;
    };
} | {
    __kind__: "MalformedCandid";
    MalformedCandid: null;
} | {
    __kind__: "AmbiguousAttribute";
    AmbiguousAttribute: {
        field: string;
        sources: Array<string>;
    };
} | {
    __kind__: "NoAttributes";
    NoAttributes: null;
} | {
    __kind__: "UnknownNonce";
    UnknownNonce: null;
} | {
    __kind__: "UntrustedSsoSource";
    UntrustedSsoSource: {
        domain: string;
    };
} | {
    __kind__: "MissingField";
    MissingField: string;
} | {
    __kind__: "FrontendOriginMismatch";
    FrontendOriginMismatch: {
        got: string;
        expected: Array<string>;
    };
};
export interface FfPerfSettings {
    targetFps: bigint;
    thermalProfile: string;
    networkMode: string;
    cpuGovernor: string;
    ioScheduler: string;
}
export interface Result {
    hasMore: boolean;
    rows: Array<Array<Cell>>;
}
export type Result__1 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: Error_;
};
export type Timestamp = bigint;
export type Value = {
    __kind__: "int";
    int: bigint;
} | {
    __kind__: "nat";
    nat: bigint;
} | {
    __kind__: "float";
    float: number;
} | {
    __kind__: "bool";
    bool: boolean;
} | {
    __kind__: "null";
    null: null;
} | {
    __kind__: "text";
    text: string;
};
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    execute(qJson: string): Promise<Result>;
    getApiDoc(): Promise<string>;
    /**
     * / Returns the caller's saved Auto settings, or the defaults when none saved.
     */
    getAutoSettings(): Promise<AutoSettings>;
    /**
     * / Returns the caller's total boost count and current power level.
     */
    getBoostStats(): Promise<BoostStats>;
    getCallerUserRole(): Promise<UserRole>;
    /**
     * / Returns the caller's saved FF Performance settings, or the defaults when none saved.
     */
    getFfPerfSettings(): Promise<FfPerfSettings>;
    isCallerAdmin(): Promise<boolean>;
    /**
     * / Returns the caller's boosts, newest first.
     */
    listBoosts(): Promise<Array<Boost>>;
    /**
     * / Records one boost for the caller and returns the updated stats.
     */
    recordBoost(): Promise<BoostStats>;
    /**
     * / Restores the caller's Auto settings to the script defaults.
     */
    resetAutoSettings(): Promise<AutoSettings>;
    /**
     * / Resets the caller's counter and history.
     */
    resetBoosts(): Promise<BoostStats>;
    /**
     * / Restores the caller's FF Performance settings to the module defaults.
     */
    resetFfPerfSettings(): Promise<FfPerfSettings>;
    /**
     * / Saves the caller's Auto settings and returns the stored value.
     */
    saveAutoSettings(settings: AutoSettings): Promise<AutoSettings>;
    /**
     * / Saves the caller's FF Performance settings and returns the stored value.
     */
    saveFfPerfSettings(settings: FfPerfSettings): Promise<FfPerfSettings>;
    schema(): Promise<string>;
}
