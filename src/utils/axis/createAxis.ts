"use strict";

import * as axisScale from "powerbi-visuals-utils-chartutils/lib/axis/axisScale";
import {Axis, axisBottom, AxisDomain, axisLeft, axisRight, AxisScale, axisTop} from "d3-axis";
import {
    AxisOrientation,
    CreateAxisOptions,
    IAxisProperties
} from "powerbi-visuals-utils-chartutils/lib/axis/axisInterfaces";
import {
    createFormatter,
    createScale,
    getCategoryValueType,
    getMinTickValueInterval,
    getRecommendedTickValues,
    isLogScalePossible,
    powerOfTen,
} from "powerbi-visuals-utils-chartutils/lib/axis/axis";

const TickLabelPadding = 2;
const ScalarTickLabelPadding = 3;

export interface CreateAxisOptionsExtended extends Omit<CreateAxisOptions, 'isVertical'> {
    orientation: AxisOrientation;
}

/**
 * Copy of function from "powerbi-visuals-utils-chartutils" due to original function doesn't allow to create right axis
 * Create a D3 axis including scale. Can be vertical or horizontal, and either datetime, numeric, or text.
 * @param options The properties used to create the axis.
 */
export function createAxis(options: CreateAxisOptionsExtended): IAxisProperties {
    const pixelSpan = options.pixelSpan, dataDomain = options.dataDomain, metaDataColumn = options.metaDataColumn,
        formatString = options.formatString, outerPadding = options.outerPadding || 0,
        isCategoryAxis = !!options.isCategoryAxis, isScalar = !!options.isScalar,
        useTickIntervalForDisplayUnits = !!options.useTickIntervalForDisplayUnits, // DEPRECATE: same meaning as isScalar?
        getValueFn = options.getValueFn, axisDisplayUnits = options.axisDisplayUnits,
        axisPrecision = options.axisPrecision, is100Pct = !!options.is100Pct,
        dataType = getCategoryValueType(metaDataColumn, isScalar);
    const orientation = options.orientation;
    let categoryThickness = options.categoryThickness;
    // Create the Scale
    const scaleResult = createScale(options);
    const scale = scaleResult.scale;
    const bestTickCount = scaleResult.bestTickCount;
    const scaleDomain = scale.domain();
    const isLogScaleAllowed = isLogScalePossible(dataDomain, dataType);
    // fix categoryThickness if scalar and the domain was adjusted when making the scale "nice"
    if (categoryThickness && isScalar && dataDomain && dataDomain.length === 2) {
        const oldSpan = dataDomain[1] - dataDomain[0];
        const newSpan = scaleDomain[1] - scaleDomain[0];
        if (oldSpan > 0 && newSpan > 0) {
            categoryThickness = categoryThickness * oldSpan / newSpan;
        }
    }
    // Prepare Tick Values for formatting
    let tickValues;
    if (isScalar && bestTickCount === 1 && !arrayIsEmpty(dataDomain)) {
        tickValues = [dataDomain[0]];
    } else {
        const minTickInterval = isScalar ? getMinTickValueInterval(formatString, dataType, is100Pct) : undefined;
        tickValues = getRecommendedTickValues(bestTickCount, scale, dataType, isScalar, minTickInterval);
    }
    if (options.scaleType && options.scaleType === axisScale.log && isLogScaleAllowed) {
        tickValues = tickValues.filter((d) => {
            return powerOfTen(d);
        });
    }
    const formatter = createFormatter(scaleDomain, dataDomain, dataType, isScalar, formatString, bestTickCount, tickValues, getValueFn, useTickIntervalForDisplayUnits, axisDisplayUnits, axisPrecision);
    // sets default orientation only, cartesianChart will fix y2 for comboChart
    // tickSize(pixelSpan) is used to create gridLines
    const axisFunction = getAxisFunction(orientation);
    const axis = axisFunction(scale)
        .tickSize(6)
        .ticks(bestTickCount)
        .tickValues(tickValues);
    let formattedTickValues = [];
    if (metaDataColumn)
        formattedTickValues = formatAxisTickValues(axis, tickValues, formatter, dataType, getValueFn);
    let xLabelMaxWidth;
    // Use category layout of labels if specified, otherwise use scalar layout of labels
    if (!isScalar && categoryThickness) {
        xLabelMaxWidth = Math.max(1, categoryThickness - TickLabelPadding * 2);
    } else {
        // When there are 0 or 1 ticks, then xLabelMaxWidth = pixelSpan
        xLabelMaxWidth = tickValues.length > 1 ? getScalarLabelMaxWidth(scale, tickValues) : pixelSpan;
        xLabelMaxWidth = xLabelMaxWidth - ScalarTickLabelPadding * 2;
    }
    return {
        scale: scale,
        axis: axis,
        formatter: formatter,
        values: formattedTickValues,
        axisType: dataType,
        axisLabel: null,
        isCategoryAxis: isCategoryAxis,
        xLabelMaxWidth: xLabelMaxWidth,
        categoryThickness: categoryThickness,
        outerPadding: outerPadding,
        usingDefaultDomain: scaleResult.usingDefaultDomain,
        isLogScaleAllowed: isLogScaleAllowed,
        dataDomain: dataDomain,
    };
}

function getAxisFunction<Domain extends AxisDomain>(orientation: AxisOrientation): (scale: AxisScale<Domain>) => Axis<Domain> {
    switch (orientation) {
        case AxisOrientation.top:
            return axisTop;
        case AxisOrientation.bottom:
            return axisBottom;
        case AxisOrientation.left:
            return axisLeft;
        case AxisOrientation.right:
            return axisRight;
    }
}

/**
 * Format the linear tick labels or the category labels.
 */
function formatAxisTickValues(axis, tickValues, formatter, dataType, getValueFn) {
    let formattedTickValues = [];
    if (!getValueFn)
        getValueFn = data => data;
    if (formatter) {
        axis.tickFormat(d => formatter.format(getValueFn(d, dataType)));
        formattedTickValues = tickValues.map(d => formatter.format(getValueFn(d, dataType)));
    } else {
        formattedTickValues = tickValues.map((d) => getValueFn(d, dataType));
    }
    return formattedTickValues;
}

function arrayIsEmpty(array) {
    return !(array && array.length);
}

function getScalarLabelMaxWidth(scale, tickValues) {
    // find the distance between two ticks. scalar ticks can be anywhere, such as:
    // |---50----------100--------|
    if (scale && !arrayIsEmpty(tickValues)) {
        return Math.abs(scale(tickValues[1]) - scale(tickValues[0]));
    }
    return 1;
}
