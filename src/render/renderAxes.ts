"use strict";

import powerbi from "powerbi-visuals-api";
import {axis} from "powerbi-visuals-utils-chartutils";
import {pixelConverter as PixelConverter} from "powerbi-visuals-utils-typeutils";
import {AxisOrientation, IAxisProperties} from "powerbi-visuals-utils-chartutils/lib/axis/axisInterfaces";
import {getFormatStringByColumn} from "powerbi-visuals-utils-formattingutils/lib/src/valueFormatter";
import {textMeasurementService, valueFormatter} from "powerbi-visuals-utils-formattingutils";
import {TextProperties} from "powerbi-visuals-utils-formattingutils/lib/src/interfaces";
import {CssConstants} from "powerbi-visuals-utils-svgutils";
import {translate as svgTranslate} from "powerbi-visuals-utils-svgutils/lib/manipulation";
import {max as d3max, min as d3min} from "d3-array";
import {select as d3select} from "d3-selection";

import {
    AxesDomains,
    d3Selection,
    IAxes,
    IMargin,
    ISize,
    VisualDataPoint,
    VisualMeasureMetadata
} from "../visualInterfaces";
import {AxisRangeType, HorizontalPosition, VerticalPosition, VisualSettings} from "../settings";
import * as visualUtils from '../utils';
import {createAxis} from "../utils/axis/createAxis";
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import DataViewPropertyValue = powerbi.DataViewPropertyValue;
import IViewport = powerbi.IViewport;

class Selectors {
    static AxisLabelSelector = CssConstants.createClassAndSelector("axisLabel");
}

export class RenderAxes {
    private static DefaultAxisXTickPadding: number = 10;
    private static DefaultAxisYTickPadding: number = 10;

    private static AxisLabelOffset: number = 2;
    private static TickLabelAndTitleGap: number = 5;
    private static YAxisLabelTransformRotate: string = "rotate(-90)";
    private static DefaultDY: string = "1em";

    public static createD3Axes(
        axesDomains: AxesDomains,
        size: ISize,
        metadata: VisualMeasureMetadata,
        settings: VisualSettings,
        host: IVisualHost,
        isSmallMultiple: boolean = false,
        dataPointThickness: number = null,
        maxXLabelsWidth = null): IAxes {

        let yAxisProperties: IAxisProperties = null;

        let valueAxisScale: string = settings.valueAxis.axisScale;

        const percentageFormat: string = "#,0.##%";

        const skipValueRange: boolean = isSmallMultiple && settings.valueAxis.rangeType !== AxisRangeType.Custom,
            startValue: number = skipValueRange ? null : settings.valueAxis.start,
            endValue: number = skipValueRange ? null : settings.valueAxis.end;

        yAxisProperties = createAxis({
            pixelSpan: size.height,
            dataDomain: axesDomains.yAxisDomain,
            metaDataColumn: metadata.cols.value,
            formatString: percentageFormat,
            outerPadding: 0,
            innerPadding: 0,
            isScalar: true,
            isCategoryAxis: false,
            scaleType: valueAxisScale,
            disableNice: startValue != null || endValue != null,
            useTickIntervalForDisplayUnits: true,
            orientation: convertPositionToAxisOrientation(settings.valueAxis.position),
        });

        yAxisProperties.axis
            .tickSizeInner(-size.width)
            .tickPadding(RenderAxes.DefaultAxisXTickPadding)
            .tickSizeOuter(1);

        yAxisProperties.axisLabel = settings.valueAxis.showTitle ? metadata.labels.x : "";

        // create Y axis
        let xAxisProperties: IAxisProperties = null;
        let xAxisFormatString: string = getFormatStringByColumn(<any>metadata.cols.category) || getFormatStringByColumn(<any>metadata.groupingColumn);

        const categoryType = axis.getCategoryValueType(metadata.cols.category);
        let isOrdinal: boolean = axis.isOrdinal(categoryType);

        let xIsScalar: boolean = !isOrdinal;
        let categoryAxisScale: string = settings.categoryAxis.axisType === "categorical" ? "linear" : settings.categoryAxis.axisScale;
        let axisType: string = !xIsScalar ? "categorical" : settings.categoryAxis.axisType;

        let dateColumnFormatter = null;

        if (metadata.cols.category) {
            dateColumnFormatter = valueFormatter.create({
                format: valueFormatter.getFormatStringByColumn(<any>metadata.cols.category, true) || metadata.cols.category.format,
                cultureSelector: host.locale
            });
        } else if (metadata.groupingColumn) {
            dateColumnFormatter = valueFormatter.create({
                format: valueFormatter.getFormatStringByColumn(<any>metadata.groupingColumn, true) || metadata.groupingColumn.format,
                cultureSelector: host.locale
            });
        }

        let innerPadding: number = settings.categoryAxis.innerPadding / 100;
        const outerPadding: number = xIsScalar && axisType === "continuous" ? dataPointThickness / 2 : 0;

        let fontSize: string = PixelConverter.toString(settings.categoryAxis.fontSize);
        let fontFamily: string = settings.categoryAxis.fontFamily;

        const skipCategoryRange: boolean = isSmallMultiple && settings.categoryAxis.rangeType !== AxisRangeType.Custom,
            startCategory: number = skipCategoryRange ? null : settings.categoryAxis.start,
            endCategory: number = skipCategoryRange ? null : settings.categoryAxis.end;

        xAxisProperties = createAxis({
            pixelSpan: size.width,
            dataDomain: axesDomains.xAxisDomain,
            metaDataColumn: metadata.cols.category || metadata.groupingColumn,
            formatString: xAxisFormatString,
            outerPadding: outerPadding,
            innerPadding: innerPadding,
            scaleType: xIsScalar ? categoryAxisScale : undefined,
            isScalar: xIsScalar && axisType === "continuous",
            isCategoryAxis: true,
            useTickIntervalForDisplayUnits: true,
            disableNice: axisType === "continuous" && (startCategory != null || endCategory != null),
            getValueFn: (index, dataType): any => {
                if (dataType.dateTime && dateColumnFormatter) {
                    let options = {};

                    if (xIsScalar && axisType === "continuous") {
                        options = {
                            month: "short",
                            year: "numeric"
                        };
                    } else {
                        options = {
                            day: "numeric",
                            month: "numeric",
                            year: "numeric"
                        };
                    }

                    let formattedString: string = dateColumnFormatter.format(new Date(index).toLocaleString("en-US", options));

                    if (maxXLabelsWidth) {
                        let textProperties: TextProperties = {
                            text: formattedString,
                            fontFamily: fontFamily,
                            fontSize: fontSize
                        };

                        return textMeasurementService.getTailoredTextOrDefault(textProperties, maxXLabelsWidth);
                    }

                    return formattedString;
                }

                if (maxXLabelsWidth && maxXLabelsWidth !== Number.MAX_VALUE) {
                    let textProperties: TextProperties = {
                        text: index.toString(),
                        fontFamily: fontFamily,
                        fontSize: fontSize
                    };

                    return textMeasurementService.getTailoredTextOrDefault(textProperties, maxXLabelsWidth);
                }
                return index;
            },
            orientation: AxisOrientation.bottom,
        });

        // For Y axis, make ticks appear full-width.
        xAxisProperties.axis
            .tickPadding(RenderAxes.DefaultAxisYTickPadding)
            .tickSizeInner(0)
            .tickSizeOuter(0);

        xAxisProperties.axisLabel = settings.categoryAxis.showTitle ? metadata.labels.y : "";

        return {
            x: xAxisProperties,
            y: yAxisProperties,
            xIsScalar: xIsScalar
        };
    }

    public static rotateXAxisTickLabels(toRotate: boolean, xAxisSvgGroup: d3Selection<SVGElement>): void {
        let axisText = xAxisSvgGroup.selectAll("g").selectAll("text");
        if (toRotate) {
            axisText.attr("transform", "rotate(-90)")
                .attr("dx", "-5.5px")
                .attr("dy", "-0.5em");

            axisText.style("text-anchor", "end");
        } else {
            axisText.attr("transform", "rotate(0)")
                .attr("dx", "0");

            axisText.style("text-anchor", "middle");
        }
    }

    public static render(settings: VisualSettings,
                         xAxisSvgGroup: d3Selection<SVGElement>,
                         yAxisSvgGroup: d3Selection<SVGElement>,
                         axes: IAxes,
                         maxYLabelsWidth = null) {
        // Now we call the axis funciton, that will render an axis on our visual.
        if (settings.valueAxis.show) {
            yAxisSvgGroup.call(axes.y.axis);
            let axisText = yAxisSvgGroup.selectAll("g").selectAll("text");
            let axisLines = yAxisSvgGroup.selectAll("g").selectAll("line");

            let valueAxisSettings = settings.valueAxis;

            let color: string = valueAxisSettings.axisColor.toString();
            let fontSize: string = PixelConverter.toString(valueAxisSettings.fontSize);
            let fontFamily: string = valueAxisSettings.fontFamily;
            let gridlinesColor: string = valueAxisSettings.gridlinesColor.toString();
            let strokeWidth: string = PixelConverter.toString(valueAxisSettings.strokeWidth);
            let showGridlines: DataViewPropertyValue = valueAxisSettings.showGridlines;
            let lineStyle: DataViewPropertyValue = valueAxisSettings.lineStyle;

            let strokeDasharray = visualUtils.getLineStyleParam(lineStyle);

            axisText.style("fill", color)
                .style("font-size", fontSize)
                .style("font-family", fontFamily);

            axisLines.style("stroke", gridlinesColor)
                .style("stroke-width", strokeWidth)
                .style("stroke-dasharray", strokeDasharray);

            if (showGridlines) {
                axisLines.style("opacity", "1");
            } else {
                axisLines.style("opacity", "0");
            }

        } else {
            yAxisSvgGroup.selectAll("*").remove();
        }

        if (settings.categoryAxis.show) {
            xAxisSvgGroup.call(axes.x.axis);
            let axisText = xAxisSvgGroup.selectAll("g").selectAll("text");

            let categoryAxisSettings = settings.categoryAxis;
            let color: string = categoryAxisSettings.axisColor.toString();
            let fontSize: string = PixelConverter.toString(categoryAxisSettings.fontSize);
            let fontFamily: string = categoryAxisSettings.fontFamily;

            axisText.style("fill", color)
                .style("stroke", "none")
                .style("font-size", fontSize)
                .style("font-family", fontFamily);
        } else {
            xAxisSvgGroup.selectAll("*").remove();
        }

    }

    public static renderLabels(
        viewport: IViewport,
        visualMargin: IMargin,
        visualSize: ISize,
        axisLabelsData: Array<string>,
        settings: VisualSettings,
        axes: IAxes,
        axisGraphicsContext: d3Selection<SVGElement>) {
        const margin: IMargin = visualMargin,
            width: number = viewport.width,
            height: number = viewport.height,
            yAxisOrientation: string = "right",
            showY1OnRight: boolean = yAxisOrientation === settings.valueAxis.position;

        let showXAxisTitle: boolean = settings.categoryAxis.show && settings.categoryAxis.showTitle;
        let showYAxisTitle: boolean = settings.valueAxis.show && settings.valueAxis.showTitle;

        if (!showXAxisTitle) {
            axisLabelsData[0] = null;
        }

        if (!showYAxisTitle) {
            axisLabelsData[1] = null;
        }

        let xColor: string = settings.categoryAxis.axisTitleColor;
        let xFontSize: number = PixelConverter.fromPointToPixel(settings.categoryAxis.titleFontSize);
        let xFontSizeString: string = PixelConverter.toString(settings.categoryAxis.titleFontSize);
        let xTitle: DataViewPropertyValue = settings.categoryAxis.axisTitle;
        let xAxisStyle: DataViewPropertyValue = settings.categoryAxis.titleStyle;
        let xAxisFontFamily: string = settings.categoryAxis.titleFontFamily;

        let yColor: string = settings.valueAxis.axisTitleColor;
        let yFontSize: number = parseInt(settings.valueAxis.titleFontSize.toString());
        let yFontSizeString: string = PixelConverter.toString(yFontSize);
        let yTitle: DataViewPropertyValue = settings.valueAxis.axisTitle;
        let yAxisStyle: DataViewPropertyValue = settings.valueAxis.titleStyle;
        let yAxisFontFamily: string = settings.valueAxis.titleFontFamily;

        axisGraphicsContext.selectAll("*")
            .data(axisLabelsData)
            .join("text")
            .text(d => d)
            .attr("class", Selectors.AxisLabelSelector.className)
            .style("text-anchor", "middle")
            .call(text => {
                const textSelectionX: d3Selection<any> = d3select(text.nodes()[0]);

                textSelectionX.attr(
                    "transform", svgTranslate(
                        (width) / RenderAxes.AxisLabelOffset,
                        (height + visualSize.height + xFontSize + margin.top) / 2))
                    .attr("dy", '.8em');

                if (showXAxisTitle && xTitle && xTitle.toString().length > 0) {
                    textSelectionX.text(xTitle as string);
                }

                if (showXAxisTitle && xAxisStyle) {
                    let newTitle: string = visualUtils.getTitleWithUnitType(textSelectionX.text(), xAxisStyle, axes.x);

                    textSelectionX.text(newTitle);
                }

                textSelectionX.style("fill", xColor)
                    .style("font-size", xFontSizeString)
                    .style("font-family", xAxisFontFamily);

                const textSelectionY: d3Selection<any> = d3select(text.nodes()[1]);

                textSelectionY.attr("transform", showY1OnRight
                    ? RenderAxes.YAxisLabelTransformRotate
                    : RenderAxes.YAxisLabelTransformRotate)
                    .attr("y", showY1OnRight
                        ? width - margin.right - yFontSize
                        : 0)
                    .attr("x", -((visualSize.height + margin.top + margin.bottom) / RenderAxes.AxisLabelOffset))
                    .attr("dy", (showY1OnRight ? '-' : '') + RenderAxes.DefaultDY);

                if (showYAxisTitle && yTitle && yTitle.toString().length > 0) {
                    textSelectionY.text(yTitle as string);
                }

                if (showYAxisTitle) {
                    let newTitle: string = visualUtils.getTitleWithUnitType(textSelectionY.text(), yAxisStyle, axes.y);

                    textSelectionY.text(newTitle);
                }

                textSelectionY.style("fill", yColor)
                    .style("font-size", yFontSizeString)
                    .style("font-family", yAxisFontFamily);
            });
    }

    public static calculateAxesDomains(allDatapoint: VisualDataPoint[],
                                       visibleDatapoints: VisualDataPoint[],
                                       settings: VisualSettings,
                                       metadata: VisualMeasureMetadata,
                                       isSmallMultiple: boolean = false): AxesDomains {
        return {
            xAxisDomain: this.calculateCategoryDomain(visibleDatapoints, settings, metadata, isSmallMultiple),
            yAxisDomain: this.calculateValueDomain(allDatapoint, settings, isSmallMultiple)
        };
    }

    public static calculateValueDomain(allDatapoint: VisualDataPoint[],
                                       settings: VisualSettings,
                                       isSmallMultiple: boolean = false): any[] {

        let minValue: number = d3min(allDatapoint.filter(x => x.value < 0), d => <number>d.shiftValue);
        let maxValue: number = d3max(allDatapoint.filter(x => x.value > 0), d => <number>d.value + d.shiftValue);

        minValue = minValue < 0 ? minValue : 0;
        maxValue = maxValue > 0 ? maxValue : 0;

        minValue = minValue < -1 ? -1 : minValue;
        maxValue = maxValue > 1 ? 1 : maxValue;

        let dataDomainMinY: number = minValue;
        let dataDomainMaxY: number = maxValue;

        let constantLineValue: number = settings.constantLine.value;

        if (constantLineValue || constantLineValue === 0) {
            dataDomainMinY = dataDomainMinY > constantLineValue ? constantLineValue : dataDomainMinY;
            dataDomainMaxY = dataDomainMaxY < constantLineValue ? constantLineValue : dataDomainMaxY;
        }

        const skipStartEnd: boolean = isSmallMultiple && settings.valueAxis.rangeType !== AxisRangeType.Custom;

        let start = skipStartEnd ? null : settings.valueAxis.start;
        let end = skipStartEnd ? null : settings.valueAxis.end;

        return [start != null ? start : dataDomainMinY, end != null ? end : dataDomainMaxY];
    }

    private static Blank: string = "(Blank)";

    public static calculateCategoryDomain(visibleDatapoints: VisualDataPoint[],
                                          settings: VisualSettings,
                                          metadata: VisualMeasureMetadata,
                                          isSmallMultiple: boolean = false): any[] {

        const categoryType = axis.getCategoryValueType(metadata.cols.category);
        let isOrdinal: boolean = axis.isOrdinal(categoryType);

        let dataDomainX = visibleDatapoints.map(d => <any>d.category);

        let xIsScalar: boolean = !isOrdinal;
        let axisType: string = !xIsScalar ? "categorical" : settings.categoryAxis.axisType;

        if (xIsScalar && axisType === "continuous") {
            dataDomainX = dataDomainX.filter(d => d !== this.Blank);
            const noBlankCategoryDatapoints: VisualDataPoint[] = visibleDatapoints.filter(d => d.category !== this.Blank);

            let dataDomainMinX: number = d3min(noBlankCategoryDatapoints, d => <number>d.category);
            let dataDomainMaxX: number = d3max(noBlankCategoryDatapoints, d => <number>d.category);

            const skipStartEnd: boolean = isSmallMultiple && settings.categoryAxis.rangeType !== AxisRangeType.Custom;

            let start = skipStartEnd ? null : settings.categoryAxis.start;
            let end = skipStartEnd ? null : settings.categoryAxis.end;

            dataDomainX = [start != null ? settings.categoryAxis.start : dataDomainMinX, end != null ? end : dataDomainMaxX];
        }

        return dataDomainX;
    }
}

export function convertPositionToAxisOrientation(
    position: HorizontalPosition | VerticalPosition | string
): AxisOrientation {
    switch (position) {
        case HorizontalPosition.Left:
            return AxisOrientation.left;

        case HorizontalPosition.Right:
            return AxisOrientation.right;

        case VerticalPosition.Top:
            return AxisOrientation.top;

        case VerticalPosition.Bottom:
            return AxisOrientation.bottom;
    }
}
