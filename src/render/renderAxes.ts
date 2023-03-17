"use strict";

import powerbiApi from "powerbi-visuals-api";
import {pixelConverter as PixelConverter, valueType} from "powerbi-visuals-utils-typeutils";
import {CssConstants, manipulation as svg} from "powerbi-visuals-utils-svgutils";
import {axis, axisInterfaces} from "powerbi-visuals-utils-chartutils";
import {AxisOrientation, IAxisProperties} from "powerbi-visuals-utils-chartutils/lib/axis/axisInterfaces";
import {textMeasurementService, valueFormatter} from "powerbi-visuals-utils-formattingutils";
import {TextProperties} from "powerbi-visuals-utils-formattingutils/lib/src/interfaces";
import {select} from "d3-selection";
import {min, max} from "d3-array";

import {
    AxesDomains,
    d3Selection,
    d3Update,
    IAxes,
    ISize,
    VisualDataPoint,
    VisualMeasureMetadata
} from "../visualInterfaces";
import {AxisRangeType, VisualSettings} from "../settings";
import {getLineStyleParam, getTitleWithUnitType} from "../utils";
import {convertPositionToAxisOrientation, createAxis} from "../utils/axis/yAxisUtils";

import IVisualHost = powerbiApi.extensibility.visual.IVisualHost;
import DataViewPropertyValue = powerbiApi.DataViewPropertyValue;
import IViewport = powerbiApi.IViewport;
import IMargin = axisInterfaces.IMargin;

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
        dataPointThickness: number | null = null,
        maxXLabelsWidth: number | null = null): IAxes {
        const categoryType: valueType.ValueType = axis.getCategoryValueType(metadata.cols.category);
        const isOrdinal: boolean = axis.isOrdinal(categoryType);

        const xIsScalar: boolean = !isOrdinal;

        const xAxisProperties = this.createXAxis(host, settings, axesDomains, metadata, size, xIsScalar, dataPointThickness, isSmallMultiple, maxXLabelsWidth);
        const yAxisProperties = this.createYAxis(settings, axesDomains, metadata, size, isSmallMultiple);

        return {
            x: xAxisProperties,
            y: yAxisProperties,
            xIsScalar: xIsScalar
        };
    }

    public static rotateXAxisTickLabels(toRotate: boolean, xAxisSvgGroup: d3Selection<SVGElement>): void {
        let axisText = xAxisSvgGroup.selectAll("g").selectAll("text");
        if (toRotate) {
            axisText.attr('transform', 'rotate(-90)');
            axisText.attr('dx', '-5.5px');
            axisText.attr('dy', '-0.5em');

            axisText.style('text-anchor', 'end');
        } else {
            axisText.attr('transform', 'rotate(0)');
            axisText.attr('dx', '0');

            axisText.style('text-anchor', 'middle');
        }
    }

    public static render(settings: VisualSettings,
                         xAxisSvgGroup: d3Selection<SVGElement>,
                         yAxisSvgGroup: d3Selection<SVGElement>,
                         axes: IAxes) {
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

            let strokeDasharray = getLineStyleParam(lineStyle);

            axisText.style("fill", color);
            axisText.style("font-size", fontSize);
            axisText.style("font-family", fontFamily);

            axisLines.style('stroke', gridlinesColor);
            axisLines.style('stroke-width', strokeWidth);
            axisLines.style('stroke-dasharray', strokeDasharray);

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

            axisText.style('fill', color);
            axisText.style('stroke', 'none');
            axisText.style('font-size', fontSize);
            axisText.style('font-family', fontFamily);
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
        axisLabelsGroup: d3Update<string>,
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

        axisLabelsGroup = axisGraphicsContext.selectAll("*")
            .data(axisLabelsData);

        // When a new category added, create a new SVG group for it.
        axisLabelsGroup.enter()
            .append("text")
            .attr("class", Selectors.AxisLabelSelector.className);

        // For removed categories, remove the SVG group.
        axisLabelsGroup.exit()
            .remove();

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

        axisLabelsGroup
            .style("text-anchor", "middle")
            .text(d => d)
            .call((text: d3Selection<any>) => {
                const textSelectionX: d3Selection<any> = select(text[0][0]);

                textSelectionX.attr(
                    'transform',
                    svg.translate(
                        width / RenderAxes.AxisLabelOffset,
                        (height + visualSize.height + xFontSize + margin.top) / 2),
                );
                textSelectionX.attr('dy', '.8em');

                if (showXAxisTitle && xTitle && xTitle.toString().length > 0) {
                    textSelectionX.text(xTitle as string);
                }

                if (showXAxisTitle && xAxisStyle) {
                    let newTitle: string = getTitleWithUnitType(textSelectionX.text(), xAxisStyle, axes.x);

                    textSelectionX.text(newTitle);
                }

                textSelectionX.style("fill", xColor);
                textSelectionX.style("font-size", xFontSizeString);
                textSelectionX.style("font-family", xAxisFontFamily);

                const textSelectionY: d3Selection<any> = select(text[0][1]);
                textSelectionY.attr('transform', showY1OnRight ? RenderAxes.YAxisLabelTransformRotate : RenderAxes.YAxisLabelTransformRotate);
                textSelectionY.attr('y', showY1OnRight ? width - margin.right - yFontSize : 0);
                textSelectionY.attr('x', -((visualSize.height + margin.top + margin.bottom) / RenderAxes.AxisLabelOffset));
                textSelectionY.attr('dy', (showY1OnRight ? '-' : '') + RenderAxes.DefaultDY);


                if (showYAxisTitle && yTitle && yTitle.toString().length > 0) {
                    textSelectionY.text(yTitle as string);
                }

                if (showYAxisTitle) {
                    const newTitle: string = getTitleWithUnitType(textSelectionY.text(), yAxisStyle, axes.y);

                    textSelectionY.text(newTitle);
                }

                textSelectionY.style("fill", yColor);
                textSelectionY.style("font-size", yFontSizeString);
                textSelectionY.style("font-family", yAxisFontFamily);
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

        let minValue: number = min(allDatapoint.filter(x => x.value < 0), d => <number>d.shiftValue);
        let maxValue: number = max(allDatapoint.filter(x => x.value > 0), d => <number>d.value + d.shiftValue);

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

            let dataDomainMinX: number = min(noBlankCategoryDatapoints, d => <number>d.category);
            let dataDomainMaxX: number = max(noBlankCategoryDatapoints, d => <number>d.category);

            const skipStartEnd: boolean = isSmallMultiple && settings.categoryAxis.rangeType !== AxisRangeType.Custom;

            let start = skipStartEnd ? null : settings.categoryAxis.start;
            let end = skipStartEnd ? null : settings.categoryAxis.end;

            dataDomainX = [start != null ? settings.categoryAxis.start : dataDomainMinX, end != null ? end : dataDomainMaxX];
        }

        return dataDomainX;
    }

    private static createXAxis(
        host: IVisualHost,
        settings: VisualSettings,
        axesDomains: AxesDomains,
        metadata: VisualMeasureMetadata,
        size: ISize,
        xIsScalar: boolean,
        dataPointThickness: number | null,
        isSmallMultiple: boolean,
        maxXLabelsWidth: number | null,
    ): IAxisProperties {
        const xAxisFormatString: string = valueFormatter.getFormatStringByColumn(<any>metadata.cols.category) || valueFormatter.getFormatStringByColumn(<any>metadata.groupingColumn);
        const axisType: string = !xIsScalar ? "categorical" : settings.categoryAxis.axisType;
        const outerPadding: number = xIsScalar && axisType === "continuous" ? dataPointThickness / 2 : 0;
        const innerPadding: number = settings.categoryAxis.innerPadding / 100;
        const categoryAxisScale: string = settings.categoryAxis.axisType === "categorical" ? "linear" : settings.categoryAxis.axisScale;
        const skipCategoryRange: boolean = isSmallMultiple && settings.categoryAxis.rangeType !== AxisRangeType.Custom;
        const startCategory: number = skipCategoryRange ? null : settings.categoryAxis.start;
        const endCategory: number = skipCategoryRange ? null : settings.categoryAxis.end;
        const fontSize: string = PixelConverter.toString(settings.categoryAxis.fontSize);
        const fontFamily: string = settings.categoryAxis.fontFamily;

        const dateColumnFormatter = ((): valueFormatter.IValueFormatter => {
            if (metadata.cols.category) {
                return valueFormatter.create({
                    format: valueFormatter.getFormatStringByColumn(<any>metadata.cols.category, true) || metadata.cols.category.format,
                    cultureSelector: host.locale
                });
            } else if (metadata.groupingColumn) {
                return valueFormatter.create({
                    format: valueFormatter.getFormatStringByColumn(<any>metadata.groupingColumn, true) || metadata.groupingColumn.format,
                    cultureSelector: host.locale
                });
            }
        })();

        const xAxisProperties: IAxisProperties = createAxis({
            orientation: AxisOrientation.bottom,
            pixelSpan: size.width,
            dataDomain: axesDomains.xAxisDomain,
            metaDataColumn: metadata.cols.category || metadata.groupingColumn,
            formatString: xAxisFormatString,
            outerPadding: outerPadding,
            innerPadding: innerPadding,
            scaleType: xIsScalar ? categoryAxisScale : undefined,
            isScalar: xIsScalar && axisType === "continuous",
            isVertical: false,
            isCategoryAxis: true,
            useTickIntervalForDisplayUnits: true,
            disableNice: axisType === "continuous" && (startCategory != null || endCategory != null),
            getValueFn: (index: number, dataType: valueType.ValueType): any => {
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
        });

        // For X axis, make ticks appear full-width.
        xAxisProperties.axis
            .tickPadding(RenderAxes.DefaultAxisYTickPadding)
            .tickSizeInner(0)
            .tickSizeOuter(0);

        xAxisProperties.axisLabel = settings.categoryAxis.showTitle ? metadata.labels.y : "";

        return xAxisProperties;
    }

    private static createYAxis(
        settings: VisualSettings,
        axesDomains: AxesDomains,
        metadata: VisualMeasureMetadata,
        size: ISize,
        isSmallMultiple: boolean,
    ): IAxisProperties {
        let valueAxisScale: string = settings.valueAxis.axisScale;
        const percentageFormat: string = "#,0.##%";

        const skipValueRange: boolean = isSmallMultiple && settings.valueAxis.rangeType !== AxisRangeType.Custom,
            startValue: number = skipValueRange ? null : settings.valueAxis.start,
            endValue: number = skipValueRange ? null : settings.valueAxis.end;

        const yAxisProperties = createAxis({
            pixelSpan: size.height,
            dataDomain: axesDomains.yAxisDomain,
            metaDataColumn: metadata.cols.value,
            formatString: percentageFormat,
            outerPadding: 0,
            innerPadding: 0,
            isScalar: true,
            isVertical: true,
            isCategoryAxis: false,
            scaleType: valueAxisScale,
            disableNice: startValue != null || endValue != null,
            useTickIntervalForDisplayUnits: true,
            orientation: convertPositionToAxisOrientation(settings.categoryAxis.position),
        });

        yAxisProperties.axis
            .tickSizeInner(-size.width)
            .tickPadding(RenderAxes.DefaultAxisXTickPadding)
            .tickSizeOuter(1);

        yAxisProperties.axisLabel = settings.valueAxis.showTitle ? metadata.labels.x : "";

        return yAxisProperties;
    }
}
