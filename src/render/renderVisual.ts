"use strict";

import powerbi from "powerbi-visuals-api";
import {CssConstants} from "powerbi-visuals-utils-svgutils";
import {ClassAndSelector} from "powerbi-visuals-utils-svgutils/lib/cssConstants";
import {
    IInteractiveBehavior,
    IInteractivityService
} from "powerbi-visuals-utils-interactivityutils/lib/interactivityBaseService";
import {ITooltipServiceWrapper} from "powerbi-visuals-utils-tooltiputils";
import {TextProperties} from "powerbi-visuals-utils-formattingutils/lib/src/interfaces";
import {textMeasurementService, valueFormatter} from "powerbi-visuals-utils-formattingutils";
import {translate as svgTranslate} from "powerbi-visuals-utils-svgutils/lib/manipulation";
import {pixelConverter as PixelConverter} from "powerbi-visuals-utils-typeutils";
import {dataLabelUtils} from "powerbi-visuals-utils-chartutils";
import {select as d3select} from "d3-selection";

import {
    Coordinates,
    d3Selection,
    IAxes, ISize,
    SmallMultipleOptions,
    VisualData,
    VisualDataPoint,
    VisualMeasureMetadata
} from "../visualInterfaces";
import {
    ConstantLineSettings,
    HorizontalPosition,
    LabelOrientation, LayoutMode,
    LineStyle,
    Position, SmallMultipleSettings, VerticalPosition,
    VisualSettings
} from "../settings";
import * as visualUtils from '../utils';
import {Visual} from "../visual";
import {WebBehaviorOptions} from "../behavior";
import {DataLabelHelper} from "../utils/dataLabelHelper";
import {Text} from "../settings";
import * as formattingUtils from '../utils/formattingUtils';

import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import PrimitiveValue = powerbi.PrimitiveValue;

class Selectors {
    static BarSelect = CssConstants.createClassAndSelector("bar");
    static BarGroupSelect = CssConstants.createClassAndSelector("bar-group");
    static AxisLabelSelector = CssConstants.createClassAndSelector("axisLabel");
}

export class RenderVisual {

    private static Label: ClassAndSelector = CssConstants.createClassAndSelector("label");

    public static render(
        data: VisualData,
        visualSvgGroup: d3Selection<SVGElement>,
        clearCatcher: d3Selection<any>,
        visualInteractivityService: IInteractivityService<any>,
        visualBehavior: IInteractiveBehavior,
        tooltipServiceWrapper: ITooltipServiceWrapper,
        host: IVisualHost,
        hasHighlight: boolean,
        settings: VisualSettings) {
        const barGroupSelect = visualSvgGroup.selectAll(Selectors.BarGroupSelect.selectorName)
            .data([data.dataPoints])
            .join("g")
            .attr("class", Selectors.BarGroupSelect.className);

        const interactivityService = visualInteractivityService,
            hasSelection: boolean = interactivityService.hasSelection();

        barGroupSelect
            .selectAll(Selectors.BarSelect.selectorName)
            .data(data.dataPoints)
            .join("rect")
            .attr("class", Selectors.BarSelect.className)
            .attr('height', d => {
                return d.barCoordinates.height;
            })
            .attr('width', d => {
                return d.barCoordinates.width;
            })
            .attr('x', d => {
                return d.barCoordinates.x;
            })
            .attr('y', d => {
                return d.barCoordinates.y;
            })
            .attr('fill', d => d.color)
            .style(
                "fill-opacity", (p: VisualDataPoint) => visualUtils.getFillOpacity(
                    p.selected,
                    p.highlight,
                    !p.highlight && hasSelection,
                    !p.selected && data.hasHighlight))
            .style("stroke", (p: VisualDataPoint) => {
                if ((hasHighlight || hasSelection) && visualUtils.isSelected(p.selected,
                    p.highlight,
                    !p.highlight && hasSelection,
                    !p.selected && hasHighlight)) {
                    return Visual.DefaultStrokeSelectionColor;
                }

                return p.color;
            })
            .style("stroke-width", p => {
                if ((hasHighlight || hasSelection) && visualUtils.isSelected(p.selected,
                    p.highlight,
                    !p.highlight && hasSelection,
                    !p.selected && hasHighlight)) {
                    return Visual.DefaultStrokeSelectionWidth;
                }

                return Visual.DefaultStrokeWidth;
            });

        if (interactivityService) {
            interactivityService.applySelectionStateToData(data.dataPoints);

            const behaviorOptions: WebBehaviorOptions = {
                bars: barGroupSelect.selectAll(Selectors.BarSelect.selectorName),
                clearCatcher: clearCatcher,
                interactivityService: visualInteractivityService,
                host: host,
                selectionSaveSettings: settings.selectionSaveSettings,
                behavior: visualBehavior,
                dataPoints: data.dataPoints
            };

            interactivityService.bind(behaviorOptions);
        }

        this.renderTooltip(
            barGroupSelect.selectAll(Selectors.BarSelect.selectorName),
            tooltipServiceWrapper);
    }

    public static renderDataLabelsBackground(
        dataPoints: VisualDataPoint[],
        settings: VisualSettings,
        dataLabelsBackgroundContext: d3Selection<any>): void {
        const labelSettings = settings.categoryLabels;
        const isHorizontal: boolean = labelSettings.orientation === LabelOrientation.Horizontal;

        dataLabelsBackgroundContext.selectAll("*").remove();

        if (!labelSettings.showBackground) {
            return;
        }

        dataLabelsBackgroundContext
            .selectAll(RenderVisual.Label.selectorName)
            .data(dataPoints)
            .join("svg:rect")
            .attr('height', d => {
                return d.labelCoordinates.height + DataLabelHelper.labelBackgroundHeightPadding * (isHorizontal ? 1 : 2);
            })
            .attr('width', d => {
                return d.labelCoordinates.width + DataLabelHelper.labelBackgroundWidthPadding;
            })
            .attr('x', d => {
                return d.labelCoordinates.x - (isHorizontal ? DataLabelHelper.labelBackgroundXShift : d.labelCoordinates.width);
            })
            .attr('y', d => {
                return d.labelCoordinates.y - d.labelCoordinates.height + (isHorizontal ? -DataLabelHelper.labelBackgroundYShift : DataLabelHelper.labelBackgroundYShift);
            })
            .attr('rx', 4)
            .attr('ry', 4)
            .attr('fill', settings.categoryLabels.backgroundColor)
            .style("fill-opacity", (100 - settings.categoryLabels.transparency) / 100)
            .style("pointer-events", "none");
    }

    public static renderDataLabelsBackgroundForSmallMultiple(
        data: VisualData,
        settings: VisualSettings,
        dataLabelsBackgroundContext: d3Selection<any>,
        dataPoints: VisualDataPoint[] = null): void {

        const labelSettings = settings.categoryLabels;

        dataLabelsBackgroundContext.selectAll("*").remove();

        if (!labelSettings.showBackground) {
            return;
        }

        const dataPointsArray: VisualDataPoint[] = this.filterData(dataPoints || data.dataPoints);

        dataLabelsBackgroundContext
            .selectAll(RenderVisual.Label.selectorName)
            .data(dataPointsArray)
            .join("svg:rect")
            .attr(
                'height', d => {
                    return d.labelCoordinates.height + DataLabelHelper.labelBackgroundHeightPadding;
                })
            .attr('width', d => {
                return d.labelCoordinates.width + DataLabelHelper.labelBackgroundWidthPadding;
            })
            .attr('x', d => {
                return d.labelCoordinates.x - DataLabelHelper.labelBackgroundXShift;
            })
            .attr('y', d => {
                return d.labelCoordinates.y - d.labelCoordinates.height - DataLabelHelper.labelBackgroundYShift;
            })
            .attr('rx', 4)
            .attr('ry', 4)
            .attr('fill', settings.categoryLabels.backgroundColor)
            .style("fill-opacity", (100 - settings.categoryLabels.transparency) / 100)
            .style("pointer-events", "none");
    }

    public static renderDataLabels(
        dataPoints: VisualDataPoint[],
        settings: VisualSettings,
        dataLabelsContext: d3Selection<any>): void {

        const labelSettings = settings.categoryLabels;

        dataLabelsContext.selectAll("*").remove();

        if (!labelSettings.show) {
            return;
        }

        const precision: number = labelSettings.precision;
        let precisionZeros: string = "";

        for (let i = 0; i < precision; ++i) {
            precisionZeros += "0";
        }

        const dataLabelFormatter = valueFormatter.create({
            precision: precision,
            format: `0.${precisionZeros}%;-0.${precisionZeros}%;0.${precisionZeros}%`
        });

        const fontSizeInPx: string = PixelConverter.fromPoint(labelSettings.fontSize);
        const fontFamily: string = labelSettings.fontFamily ? labelSettings.fontFamily : dataLabelUtils.LabelTextProperties.fontFamily;

        dataLabelsContext
            .selectAll(RenderVisual.Label.selectorName)
            .data(dataPoints)
            .join("svg:text")
            .attr("transform", (p: VisualDataPoint) => {
                return svgTranslate(p.labelCoordinates.x, p.labelCoordinates.y) + (labelSettings.orientation === LabelOrientation.Horizontal ? "" : "rotate(-90)");
            })
            .style("fill", labelSettings.color)
            .style("font-size", fontSizeInPx)
            .style("font-family", fontFamily)
            .style("pointer-events", "none")
            .text((p: VisualDataPoint) => dataLabelFormatter.format(p.percentValue));
    }

    public static renderDataLabelsForSmallMultiple(
        data: VisualData,
        settings: VisualSettings,
        dataLabelsContext: d3Selection<any>,
        metadata: VisualMeasureMetadata,
        dataPoints: VisualDataPoint[] = null): void {

        const labelSettings = settings.categoryLabels;

        dataLabelsContext.selectAll("*").remove();

        if (!labelSettings.show) {
            return;
        }

        const dataPointsArray: VisualDataPoint[] = this.filterData(dataPoints || data.dataPoints);

        const dataLabelFormatter =
            formattingUtils.createFormatter(labelSettings.displayUnits,
                labelSettings.precision,
                metadata.cols.value,
                formattingUtils.getValueForFormatter(data));

        const fontSizeInPx: string = PixelConverter.fromPoint(labelSettings.fontSize);
        const fontFamily: string = labelSettings.fontFamily ? labelSettings.fontFamily : dataLabelUtils.LabelTextProperties.fontFamily;

        dataLabelsContext
            .selectAll(RenderVisual.Label.selectorName)
            .data(dataPointsArray)
            .join("svg:text")
            .attr("transform", (p: VisualDataPoint) => {
                return svgTranslate(p.labelCoordinates.x, p.labelCoordinates.y);
            })
            .style("fill", labelSettings.color)
            .style("font-size", fontSizeInPx)
            .style("font-family", fontFamily)
            .style("pointer-events", "none")
            .text((p: VisualDataPoint) => dataLabelFormatter.format(p.value));
    }

    public static renderSmallMultipleTopTitle(options: SmallMultipleOptions, settings: SmallMultipleSettings) {
        const uniqueColumns = options.columns,
            index: number = options.index,
            chartSize: ISize = options.chartSize,
            chartElement: d3Selection<any> = options.chartElement,
            leftSpace: number = options.leftSpace,
            topSpace: number = options.topSpace,
            textHeight: number = options.textHeight,
            fontSizeInPx: string = PixelConverter.fromPoint(settings.fontSize),
            fontFamily: string = settings.fontFamily;

        const topTitles: d3Selection<SVGElement> = chartElement.append("svg");

        const textProperties: TextProperties = {
            fontFamily,
            fontSize: fontSizeInPx
        };

        topTitles.selectAll("*")
            .data([uniqueColumns[index]])
            .join("text")
            .attr("class", Selectors.AxisLabelSelector.className)
            .style("text-anchor", "middle")
            .style("font-size", fontSizeInPx)
            .style("font-family", fontFamily)
            .style("fill", settings.fontColor)
            .attr('dy', "0.3em")
            .text(d => {
                if (d || d === 0) {
                    textProperties.text = d.toString();
                    return textMeasurementService.getTailoredTextOrDefault(textProperties, chartSize.width - 10);
                }

                return null;
            })
            .call((text: d3Selection<any>) => {
                const textSelectionX: d3Selection<any> = d3select(text.nodes()[0]);
                const x = leftSpace + chartSize.width / 2;

                textSelectionX.attr("transform", svgTranslate(x, topSpace + textHeight / 2));
            });
    }

    public static filterData(dataPoints: VisualDataPoint[]): VisualDataPoint[] {
        const filteredDatapoints: VisualDataPoint[] = [];
        const validCoordinatesDataPoints: VisualDataPoint[] = dataPoints.filter(x => x.labelCoordinates && !isNaN(x.percentValue));

        for (const index in validCoordinatesDataPoints) {
            const dataPoint = validCoordinatesDataPoints[index];
            const coords: Coordinates = dataPoint.labelCoordinates;
            let isIntersected: boolean = false;

            for (const i in filteredDatapoints) {
                const filteredDatapoint: VisualDataPoint = filteredDatapoints[i];
                const filteredCoods: Coordinates = filteredDatapoint.labelCoordinates;

                if (coords.x < filteredCoods.x + filteredCoods.width + 8
                    && coords.x + coords.width > filteredCoods.x + 8
                    && coords.y < filteredCoods.y + filteredCoods.height + 2
                    && coords.y + coords.height > filteredCoods.y + 2) {
                    isIntersected = true;
                    break;
                }
            }

            if (!isIntersected) {
                filteredDatapoints.push(dataPoint);
            }
        }

        return filteredDatapoints;
    }

    public static renderTooltip(selection: d3Selection<any>, tooltipServiceWrapper: ITooltipServiceWrapper): void {
        tooltipServiceWrapper.addTooltip(
            selection,
            (tooltipEvent: VisualDataPoint) => tooltipEvent.tooltips,
            null,
            true);
    }

    public static renderConstantLine(settings: ConstantLineSettings, element: d3Selection<SVGElement>, axes: IAxes, width: number) {
        let line: d3Selection<any> = element.select(".const-line");

        let yValue: number = settings.value;

        const yMinDomain = axes.y.dataDomain[1];
        const yMaxDomain = axes.y.dataDomain[0];

        if (yValue < yMinDomain) {
            yValue = yMinDomain;
        } else if (yValue > yMaxDomain) {
            yValue = yMaxDomain;
        }

        const y = axes.y.scale(yValue);
        const x = axes.x.scale(axes.x.dataDomain[0]);

        if (line.nodes()[0]) {
            element.selectAll("line").remove();
        }

        if (settings.position === Position.InFront) {
            line = element.append("line");
        } else {
            line = element.insert("line", ".bar-group");
        }

        line
            .classed("const-line", true)
            .style('display', settings.show ? "unset" : "none")
            .style('stroke', settings.lineColor)
            .style("stroke-opacity", 1 - settings.transparency / 100)
            .style("stroke-width", "3px")
            .attr("y2", y)
            .attr("x2", width)
            .attr("y1", y);

        if (settings.lineStyle === LineStyle.Dotted) {
            line.style("stroke-dasharray", "1, 5")
                .style("stroke-linecap", "round");
        } else if (settings.lineStyle === LineStyle.Dashed) {
            line.style("stroke-dasharray", "5, 5");
        }

        const textProperties: TextProperties = {
            fontFamily: "wf_standard-font, helvetica, arial, sans-serif",
            fontSize: "10px"
        };

        const text: string = this.getLineText(settings);
        const textWidth: number = textMeasurementService.measureSvgTextWidth(textProperties, text);
        const textHeight: number = textMeasurementService.estimateSvgTextHeight(textProperties);

        let label: d3Selection<any> = element.select(".const-label");

        if (label.nodes()[0]) {
            element.selectAll("text").remove();
        }

        if (settings.show && settings.dataLabelShow) {
            label = element
                .append("text")
                .classed("const-label", true);

            label
                .attr('transform', this.getTranslateForStaticLineLabel(x, y, textWidth, textHeight, settings, axes, width));

            label
                .text(text)
                .style("font-family", "wf_standard-font, helvetica, arial, sans-serif")
                .style("font-size", "10px")
                .style('fill', settings.fontColor);
        }
    }

    private static getLineText(settings: ConstantLineSettings): string {
        const displayUnits: number = settings.displayUnits;
        const precision: number = settings.precision;

        const formatter = valueFormatter.create({
            value: displayUnits,
            value2: 0,
            precision: precision,
            format: "0"
        });

        switch (settings.text) {
            case Text.Name: {
                return settings.name;
            }
            case Text.Value: {
                return formatter.format(settings.value);
            }
            case Text.NameAndValue: {
                return settings.name + " " + formatter.format(settings.value);
            }
        }
    }

    private static getTranslateForStaticLineLabel(x: number, y: number, textWidth: number, textHeight: number, settings: ConstantLineSettings, axes: IAxes, width: number) {
        let positionAlong: number;
        const marginAlong: number = 8;
        if (settings.horizontalPosition === HorizontalPosition.Left) {
            positionAlong = marginAlong;
        } else {
            positionAlong = width - textWidth - marginAlong;
        }

        const marginAcross: number = 5;
        let positionAcross: number;
        if (settings.verticalPosition === VerticalPosition.Top) {
            positionAcross = y - (marginAcross + textHeight);
        } else {
            positionAcross = y + (marginAcross + textHeight);
        }

        const minPosition: number = axes.y.scale(axes.y.dataDomain[0]);
        const maxPosition: number = axes.y.scale(axes.y.dataDomain[1]);

        if (positionAcross <= minPosition) {
            positionAcross = minPosition + marginAcross;
        } else if (positionAcross >= maxPosition) {
            positionAcross = maxPosition - (textHeight + marginAcross);
        }

        return svgTranslate(positionAlong, positionAcross);
    }

    private static gapBetweenCharts: number = 10;

    public static renderSmallMultipleLines(options: SmallMultipleOptions, settings: SmallMultipleSettings) {

        const uniqueRows: PrimitiveValue[] = options.rows,
            uniqueColumns: PrimitiveValue[] = options.columns,
            chartSize: ISize = options.chartSize,
            chartElement: d3Selection<any> = options.chartElement,
            leftSpace: number = options.leftSpace,
            topSpace: number = options.topSpace,
            rowsInFlow: number = options.rowsInFlow;

        for (let i = 1; i < uniqueRows.length; ++i) {
            let y: number = 0;
            if (settings.layoutMode === LayoutMode.Matrix) {
                y = topSpace * 2 + i * chartSize.height + this.gapBetweenCharts * (i - 1);
            } else {
                y = topSpace * i * rowsInFlow + i * chartSize.height * rowsInFlow + this.gapBetweenCharts * (i * rowsInFlow - 1) + this.gapBetweenCharts / 2;
            }

            const line = chartElement.append("line")
                .style("stroke", "#aaa")
                .style("stroke-width", 1);

            line.attr('x1', 0)//leftSpace + gapBetweenCharts / 2,
                .attr('x2', leftSpace + uniqueColumns.length * chartSize.width + this.gapBetweenCharts * uniqueColumns.length)
                .attr('y1', y)
                .attr('y2', y);
        }

        if (settings.layoutMode === LayoutMode.Matrix) {
            for (let j = 1; j < uniqueColumns.length; ++j) {
                const x = leftSpace + j * chartSize.width + this.gapBetweenCharts * j;

                const line = chartElement.append("line")
                    .style("stroke", "#aaa")
                    .style("stroke-width", 1);

                line.attr('x1', x)
                    .attr('x2', x)
                    .attr('y1', 0)
                    .attr('y2', topSpace + uniqueRows.length * chartSize.height + this.gapBetweenCharts * uniqueRows.length);
            }
        }
    }

    public static renderSmallMultipleTitles(options: SmallMultipleOptions, settings: SmallMultipleSettings) {
        const uniqueColumns: PrimitiveValue[] = options.columns,
            uniqueRows: PrimitiveValue[] = options.rows,
            chartSize: ISize = options.chartSize,
            chartElement: d3Selection<any> = options.chartElement,
            leftSpace: number = options.leftSpace,
            topSpace: number = options.topSpace,
            fontSizeInPx: string = PixelConverter.fromPoint(settings.fontSize),
            fontFamily: string = settings.fontFamily,
            rowsInFlow: number = options.rowsInFlow;

        if (settings.layoutMode === LayoutMode.Matrix) {
            const topTitles: d3Selection<SVGElement> = chartElement.append("svg");

            const textProperties: TextProperties = {
                fontFamily,
                fontSize: fontSizeInPx
            };

            topTitles.selectAll("*")
                .data(uniqueColumns)
                .join("text")
                .attr("class", Selectors.AxisLabelSelector.className)
                .style("text-anchor", "middle")
                .style("font-size", fontSizeInPx)
                .style("font-family", fontFamily)
                .style("fill", settings.fontColor)
                .attr('dy', "1em")
                .text(d => {
                    if (d || d === 0) {
                        textProperties.text = d.toString();
                        return textMeasurementService.getTailoredTextOrDefault(textProperties, chartSize.width - 10);
                    }

                    return null;
                })
                .call((text: d3Selection<any>) => {
                    for (let j = 0; j < uniqueColumns.length; ++j) {
                        const textSelectionX: d3Selection<any> = d3select(text.nodes()[j]);
                        const x = leftSpace + j * chartSize.width + chartSize.width / 2 + this.gapBetweenCharts * j;

                        textSelectionX.attr("transform", svgTranslate(x, topSpace / 2));
                    }
                });
        }

        const leftTitleSpace: number = 120;

        const textProperties: TextProperties = {
            fontFamily,
            fontSize: fontSizeInPx
        };

        const leftTitles: d3Selection<SVGElement> = chartElement.append("svg");

        leftTitles.selectAll("*")
            .data(uniqueRows)
            .join("text")
            .attr("class", Selectors.AxisLabelSelector.className)
            .style("text-anchor", "middle")
            .style("font-size", fontSizeInPx)
            .style("font-family", fontFamily)
            .style("fill", settings.fontColor)
            .text(d => {
                if (d || d === 0) {
                    textProperties.text = d.toString();
                    return textMeasurementService.getTailoredTextOrDefault(textProperties, leftTitleSpace);
                }

                return null;
            })
            .call((text: d3Selection<any>) => {
                for (let i = 0; i < uniqueRows.length; ++i) {
                    const textSelectionX: d3Selection<any> = d3select(text.nodes()[i]);
                    let y = 0;

                    if (settings.layoutMode === LayoutMode.Flow) {

                        const previousChartGroupHeight: number = i * rowsInFlow * chartSize.height + this.gapBetweenCharts * i * rowsInFlow + topSpace * rowsInFlow * i;
                        y = previousChartGroupHeight + rowsInFlow * chartSize.height / 2 + topSpace;
                    } else {
                        y = i * chartSize.height + chartSize.height / 2 + topSpace * 2 + this.gapBetweenCharts * i;
                    }

                    textSelectionX.attr("transform", svgTranslate(leftSpace / 2, y));
                }
            });
    }
}
