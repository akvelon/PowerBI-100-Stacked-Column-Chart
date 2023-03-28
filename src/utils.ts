"use strict";

import {axis} from "powerbi-visuals-utils-chartutils";
import powerbi from "powerbi-visuals-api";
import {max as d3max, min as d3min} from "d3-array";
import {TextProperties} from "powerbi-visuals-utils-formattingutils/lib/src/interfaces";
import {textMeasurementService, valueFormatter} from "powerbi-visuals-utils-formattingutils";
import {IAxisProperties} from "powerbi-visuals-utils-chartutils/lib/axis/axisInterfaces";
import {IValueFormatter} from "powerbi-visuals-utils-formattingutils/lib/src/valueFormatter";

import {
    CategoryDataPoints,
    d3Selection,
    IAxes,
    ISize,
    VisualData,
    VisualDataPoint,
    VisualMeasureMetadata
} from "./visualInterfaces";
import {Field} from "./dataViewConverter";
import {
    AxisRangeType,
    CategoryAxisSettings,
    CategoryLabelsSettings,
    LabelOrientation,
    ValueAxisSettings,
    VisualSettings
} from "./settings";
import * as formattingUtils from './utils/formattingUtils';
import {DataLabelHelper} from "./utils/dataLabelHelper";

import DataViewMetadataColumn = powerbi.DataViewMetadataColumn;
import DataView = powerbi.DataView;

const DisplayUnitValue: number = 1;

export function calculateBarCoordianatesByData(data: VisualData, settings: VisualSettings, barHeight: number, isSmallMultiple: boolean = false): void {
    const dataPoints: VisualDataPoint[] = data.dataPoints;
    const axes: IAxes = data.axes;

    this.calculateBarCoordianates(dataPoints, axes, settings, barHeight, isSmallMultiple);
}

export function calculateBarCoordianates(dataPoints: VisualDataPoint[], axes: IAxes, settings: VisualSettings, dataPointThickness: number, isSmallMultiple: boolean = false): void {
    const categoryAxisIsContinuous: boolean = axes.xIsScalar && settings.categoryAxis.axisType !== "categorical";

    const skipCategoryStartEnd: boolean = isSmallMultiple && settings.categoryAxis.rangeType !== AxisRangeType.Custom,
        skipValueStartEnd: boolean = isSmallMultiple && settings.valueAxis.rangeType !== AxisRangeType.Custom;

    const categoryAxisStartValue: number = categoryAxisIsContinuous && settings.categoryAxis.start ? settings.categoryAxis.start : -Number.MAX_VALUE;
    const categoryAxisEndValue: number = categoryAxisIsContinuous && settings.categoryAxis.end ? settings.categoryAxis.end : Number.MAX_VALUE;

    const thickness: number = dataPointThickness;

    dataPoints.forEach(point => {
        let width = 0;
        if (!axes.xIsScalar || !categoryAxisIsContinuous) {
            width = axes.x.scale.bandwidth();
        } else {
            width = dataPoints.length > 2 ? dataPointThickness * 0.8 : dataPointThickness / 2 * 0.8;
        }

        if (categoryAxisIsContinuous) {
            const categoryvalueIsInRange: boolean = point.category >= categoryAxisStartValue && point.category <= categoryAxisEndValue;
            if (!categoryvalueIsInRange) {
                setZeroCoordinatesForPoint(point);
                return;
            }
        }

        const x: number = axes.x.scale(point.category);

        const minYDomain = axes.y.dataDomain[1]
        const maxYDomain = axes.y.dataDomain[0];
        if (point.shiftValue > maxYDomain) {
            setZeroCoordinatesForPoint(point);
            return;
        }

        const fromValue: number = Math.max(point.shiftValue, minYDomain);
        let fromCoordinate: number;
        fromCoordinate = axes.y.scale(fromValue);
        if (point.shiftValue + point.percentValueForHeight < minYDomain) {
            setZeroCoordinatesForPoint(point);
            return;
        }

        const toValue = Math.max(point.shiftValue + point.percentValueForHeight, minYDomain);

        let toCoordinate: number = axes.y.scale(toValue);
        toCoordinate = Math.max(toCoordinate, minYDomain);

        if (toCoordinate >= fromCoordinate) {
            setZeroCoordinatesForPoint(point);
            return;
        }

        let volume: number = fromCoordinate - toCoordinate;
        if (volume < 1 && volume !== 0) {
            volume = 1;
        }

        point.barCoordinates = {
            height: volume,
            width: width,
            x,
            y: toCoordinate
        };
    });

    if (axes.xIsScalar && settings.categoryAxis.axisType !== "categorical") {
        recalculateThicknessForContinuous(dataPoints, skipCategoryStartEnd, settings.categoryAxis, thickness);
    }
}

function setZeroCoordinatesForPoint(point: VisualDataPoint): void {
    point.barCoordinates = {height: 0, width: 0, x: 0, y: 0};
}

export function recalculateThicknessForContinuous(dataPoints: VisualDataPoint[], skipCategoryStartEnd: boolean, categorySettings: CategoryAxisSettings, startThickness: number) {
    let minWidth: number = 1.5,
        minDistance: number = Number.MAX_VALUE;

    const start = skipCategoryStartEnd ? null : categorySettings.start,
        end = skipCategoryStartEnd ? null : categorySettings.end;

    const sortedDataPoints: VisualDataPoint[] = dataPoints.sort((a, b) => {
        return a.barCoordinates.x - b.barCoordinates.x;
    });

    const sortedBarCoordinates: number[] = sortedDataPoints.map(d => d.barCoordinates.x).filter((v, i, a) => a.indexOf(v) === i);

    let firstCoodinate: number = sortedBarCoordinates[0];

    for (let i = 1; i < sortedBarCoordinates.length; ++i) {
        const distance: number = sortedBarCoordinates[i] - firstCoodinate;

        minDistance = distance < minDistance ? distance : minDistance;
        firstCoodinate = sortedBarCoordinates[i];
    }

    if (minDistance < minWidth) {

    } else if (minWidth < minDistance) {
        minWidth = minDistance;
    }

    sortedDataPoints.forEach(d => {
        let width: number = 0;
        if (startThickness > minWidth) {
            const padding: number = minWidth / 100 * 20;
            width = minWidth - padding;
        } else {
            width = d.barCoordinates.width;
        }

        width = start != null && start > d.category || width < 0 ? 0 : width;
        width = end != null && end <= d.category ? 0 : width;

        d.barCoordinates.width = width;

        d.barCoordinates.x = d.barCoordinates.x - d.barCoordinates.width / 2;
    });
}

export function buildDataPointsArayByCategories(dataPoints: VisualDataPoint[]): CategoryDataPoints[] {
    const dataPointsByCategories: CategoryDataPoints[] = [];
    let categoryIndex: number = 0;
    let categoryName: string = '';
    let previousCategoryName: string = '';
    for (let i: number = 0; i < dataPoints.length; i++) {
        previousCategoryName = categoryName;
        categoryName = dataPoints[i].category.toString();

        if (i > 0 && categoryName !== previousCategoryName) {
            categoryIndex++;
        }

        if (!dataPointsByCategories[categoryIndex]) {
            const category: CategoryDataPoints = {
                categoryName,
                dataPoints: []
            };
            dataPointsByCategories[categoryIndex] = category;
        }
        dataPointsByCategories[categoryIndex].dataPoints.push(dataPoints[i]);
    }
    return dataPointsByCategories;
}

export function calculateLabelCoordinates(data: VisualData,
                                          settings: CategoryLabelsSettings,
                                          chartHeight: number,
                                          isLegendRendered: boolean,
                                          dataPoints: VisualDataPoint[] = null) {

    if (!settings.show) {
        return;
    }

    const dataPointsArray: VisualDataPoint[] = dataPoints || data.dataPoints;

    const textPropertiesForWidth: TextProperties = formattingUtils.getTextProperties(settings);
    const textPropertiesForHeight: TextProperties = formattingUtils.getTextPropertiesForHeightCalculation(settings);

    const precision: number = settings.precision;

    let precisionZeros: string = "";

    for (let i = 0; i < precision; ++i) {
        precisionZeros += "0";
    }

    const dataLabelFormatter: IValueFormatter = valueFormatter.create({
        precision: precision,
        format: `0.${precisionZeros}%;-0.${precisionZeros}%;0.${precisionZeros}%`
    });

    dataPointsArray.forEach(dataPoint => {
        const formattedText: string = dataLabelFormatter.format(dataPoint.percentValue);
        textPropertiesForHeight.text = formattedText;

        const isHorizontal: boolean = settings.orientation === LabelOrientation.Horizontal;

        const textHeight: number = isHorizontal ?
            textMeasurementService.estimateSvgTextHeight(textPropertiesForWidth)
            : textMeasurementService.measureSvgTextWidth(textPropertiesForWidth, formattedText);

        const textWidth: number = isHorizontal ?
            textMeasurementService.measureSvgTextWidth(textPropertiesForWidth, formattedText)
            : textMeasurementService.estimateSvgTextHeight(textPropertiesForWidth);

        const barWidth: number = dataPoint.barCoordinates.width;

        if (settings.overflowText || textWidth +
            (settings.showBackground ? DataLabelHelper.labelBackgroundHeightPadding : 0) < barWidth) {

            const dx: number = dataPoint.barCoordinates.x + dataPoint.barCoordinates.width / 2 + (isHorizontal ? -(textWidth) / 2 : (textWidth) / 3),
                dy: number = DataLabelHelper.calculatePositionShift(settings, textHeight, dataPoint, chartHeight, isLegendRendered);

            if (dy !== null) {
                dataPoint.labelCoordinates = {
                    x: dx,
                    y: dy,
                    width: textWidth,
                    height: textHeight
                };
            } else {
                dataPoint.labelCoordinates = null;
            }
        } else {
            dataPoint.labelCoordinates = null;
        }
    });
}

export function getNumberOfValues(dataView: DataView): number {
    const columns: DataViewMetadataColumn[] = dataView.metadata.columns;
    let valueFieldsCount: number = 0;

    for (const columnName in columns) {
        const column: DataViewMetadataColumn = columns[columnName];

        if (column.roles && column.roles[Field.Value]) {
            ++valueFieldsCount;
        }
    }

    return valueFieldsCount;
}

export function getLineStyleParam(lineStyle) {
    let strokeDasharray;

    switch (lineStyle) {
        case "solid":
            strokeDasharray = "none";
            break;
        case "dashed":
            strokeDasharray = "7, 5";
            break;
        case "dotted":
            strokeDasharray = "2, 2";
            break;
    }

    return strokeDasharray;
}

export function getUnitType(xAxis: IAxisProperties): string {
    if (xAxis.formatter
        && xAxis.formatter.displayUnit
        && xAxis.formatter.displayUnit.value > DisplayUnitValue) {

        return xAxis.formatter.displayUnit.title;
    }

    return null;
}

export function getTitleWithUnitType(title, axisStyle, axis: IAxisProperties): string {
    const unitTitle = getUnitType(axis) || "No unit";
    switch (axisStyle) {
        case "showUnitOnly": {
            return unitTitle;
        }
        case "showTitleOnly": {
            return title;
        }
        case "showBoth": {
            return `${title} (${unitTitle})`;
        }
    }
}

export const DimmedOpacity: number = 0.4;
export const DefaultOpacity: number = 1.0;

export function getFillOpacity(selected: boolean, highlight: boolean, hasSelection: boolean, hasPartialHighlights: boolean): number {
    if ((hasPartialHighlights && !highlight) || (hasSelection && !selected)) {
        return DimmedOpacity;
    }

    return DefaultOpacity;
}

const CategoryMinWidth: number = 1;
const CategoryMaxWidth: number = 450;

const CategoryContinuousMinHeight: number = 1;

export function calculateDataPointThickness(
    visualDataPoints: VisualDataPoint[],
    visualSize: ISize,
    categoriesCount: number,
    categoryInnerPadding: number,
    settings: VisualSettings,
    isCategorical: boolean = false,
    isSmallMultiple: boolean = false): number {

    const currentThickness = visualSize.width / categoriesCount;
    let thickness: number = 0;

    if (isCategorical || settings.categoryAxis.axisType === "categorical") {
        const innerPadding: number = categoryInnerPadding / 100;
        thickness = d3min([CategoryMaxWidth, d3max([CategoryMinWidth, currentThickness])]) * (1 - innerPadding);
    } else {
        let dataPoints = [...visualDataPoints];

        const skipStartEnd: boolean = isSmallMultiple && settings.categoryAxis.rangeType !== AxisRangeType.Custom;

        const start = skipStartEnd ? null : settings.categoryAxis.start,
            end = skipStartEnd ? null : settings.categoryAxis.end;

        if (start != null || end != null) {
            dataPoints = dataPoints.filter(x => start != null ? x.value >= start : end != null ? x.value <= end : true);
        }

        const dataPointsCount: number = dataPoints.map(x => x.category).filter((v, i, a) => a.indexOf(v) === i).length;

        if (dataPointsCount < 4) {
            const devider: number = 3.75;
            thickness = visualSize.width / devider;
        } else {
            const devider: number = 3.75 + 1.25 * (dataPointsCount - 3);
            thickness = visualSize.width / devider;
        }
    }

    return thickness;
}

export function getLabelsMaxWidth(group: d3Selection<any> | undefined): number {
    const widths: Array<number> = [];

    group.nodes().forEach((item: any) => {
        const dimension: ClientRect = item.getBoundingClientRect();
        widths.push(d3max([dimension.width, dimension.height]));
    });

    if (!group || group.size() === 0) {
        widths.push(0);
    }

    return d3max(widths);
}

export function getLabelsMaxHeight(group: d3Selection<any> | undefined): number {
    const heights: Array<number> = [];

    group.nodes().forEach((item: any) => {
        const dimension: ClientRect = item.getBoundingClientRect();
        heights.push(dimension.height);
    });

    if (!group || group.size() === 0) {
        heights.push(0);
    }

    return d3max(heights);
}

export function GetYAxisTitleHeight(valueSettings: ValueAxisSettings): number {

    const textPropertiesForHeight: TextProperties = {
        fontFamily: valueSettings.titleFontFamily,
        fontSize: valueSettings.titleFontSize.toString()
    };

    return textMeasurementService.estimateSvgTextHeight(textPropertiesForHeight);
}

export function GetXAxisTitleHeight(categorySettings: CategoryAxisSettings): number {

    const textPropertiesForHeight: TextProperties = {
        fontFamily: categorySettings.titleFontFamily,
        fontSize: categorySettings.titleFontSize.toString()
    };

    return textMeasurementService.estimateSvgTextHeight(textPropertiesForHeight);
}

export function isSelected(selected: boolean, highlight: boolean, hasSelection: boolean, hasPartialHighlights: boolean): boolean {
    return !(hasPartialHighlights && !highlight || hasSelection && !selected);
}

export function smallMultipleLabelRotationIsNeeded(
    xAxisSvgGroup: d3Selection<any>,
    barHeight: number,
    categoryAxisSettings: CategoryAxisSettings,
    maxLabelHeight: number
): boolean {
    const rangeBand = barHeight;

    let maxLabelWidth: number = 0;

    xAxisSvgGroup.selectAll('text').each(function () {
        const labelWidth: number = (<any>this).getBoundingClientRect().width;

        maxLabelWidth = Math.max(maxLabelWidth, labelWidth > maxLabelHeight ? maxLabelHeight : labelWidth);
    });

    return maxLabelWidth > rangeBand;
}

export function compareObjects(obj1: any[], obj2: any[], property: string): boolean {
    let isEqual: boolean = false;

    if (obj1.length > 0 && obj2.length > 0 && obj1.length === obj2.length) {
        isEqual = true;
        obj1.forEach((o1, i) => {
            obj2.forEach((o2, j) => {
                if (i === j) {
                    isEqual = isEqual && o1[property] === o2[property];
                }
            });
        });
    } else if (obj1.length === 0 && obj2.length === 0) {
        isEqual = true;
    }

    return isEqual;
}

export function isScalar(column: DataViewMetadataColumn) {
    const categoryType = axis.getCategoryValueType(column);
    const isOrdinal: boolean = axis.isOrdinal(categoryType);

    return !isOrdinal;
}

export function categoryIsScalar(metadata: VisualMeasureMetadata): boolean {
    const categoryType = axis.getCategoryValueType(metadata.cols.category);
    const isOrdinal: boolean = axis.isOrdinal(categoryType);

    return !isOrdinal;
}
