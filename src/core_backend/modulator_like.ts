/**
 * What the modulator checks read of a modulator, so they take core modulators and views alike.
 */
export interface ModulatorLike {
    readonly destination: number;
    readonly transformAmount: number;
    readonly transformType: number;
    readonly primarySource: SourceLike;
    readonly secondarySource: SourceLike;
}

export interface SourceLike {
    readonly index: number;
    readonly isCC: boolean;
    readonly isBipolar: boolean;
    readonly isNegative: boolean;
    readonly curveType: number;
}
