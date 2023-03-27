import {CssConstants} from "powerbi-visuals-utils-svgutils";
import {ClassAndSelector} from "powerbi-visuals-utils-svgutils/lib/cssConstants";
import {Coordinates, d3Selection, IAxes, VisualData, VisualDataPoint} from "../visualInterfaces";
import {
    IInteractiveBehavior,
    IInteractivityService
} from "powerbi-visuals-utils-interactivityutils/lib/interactivityBaseService";
import {ITooltipServiceWrapper, TooltipEventArgs} from "powerbi-visuals-utils-tooltiputils";
import powerbi from "powerbi-visuals-api";
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import {
    ConstantLineSettings,
    HorizontalPosition,
    LabelOrientation,
    LineStyle,
    Position, VerticalPosition,
    VisualSettings
} from "../settings";
import * as visualUtils from '../utils';
import {Visual} from "../visual";
import {WebBehaviorOptions} from "../behavior";
import {DataLabelHelper} from "../utils/dataLabelHelper";
import {TextProperties} from "powerbi-visuals-utils-formattingutils/lib/src/interfaces";
import {textMeasurementService, valueFormatter} from "powerbi-visuals-utils-formattingutils";
import {Text} from "../settings";
import {translate} from "powerbi-visuals-utils-svgutils/lib/manipulation";


// module powerbi.extensibility.visual {
//     import svg = powerbi.extensibility.utils.svg;
//     import CssConstants = svg.CssConstants;
//     import IInteractiveBehavior = powerbi.extensibility.utils.interactivity.IInteractiveBehavior;
//     import IInteractivityService = powerbi.extensibility.utils.interactivity.IInteractivityService;
//     import TooltipEventArgs = powerbi.extensibility.utils.tooltip.TooltipEventArgs;
//     import ITooltipServiceWrapper = powerbi.extensibility.utils.tooltip.ITooltipServiceWrapper;
//     import UpdateSelection = d3.selection.Update;
//     import dataLabelUtils = powerbi.extensibility.utils.chart.dataLabel.utils;
//     import PixelConverter = powerbi.extensibility.utils.type.PixelConverter;
//     import ValueFormatter = powerbi.extensibility.utils.formatting.valueFormatter;
//     import IValueFormatter = powerbi.extensibility.utils.formatting.IValueFormatter;
//     import translate = powerbi.extensibility.utils.svg.translate;
//     import ClassAndSelector = powerbi.extensibility.utils.svg.CssConstants.ClassAndSelector;
//     import createClassAndSelector = powerbi.extensibility.utils.svg.CssConstants.createClassAndSelector;
//     import TextProperties = powerbi.extensibility.utils.formatting.TextProperties;
//     import TextMeasurementService = powerbi.extensibility.utils.formatting.textMeasurementService;


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

        let interactivityService = visualInteractivityService,
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

            let behaviorOptions: WebBehaviorOptions = {
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
        let labelSettings = settings.categoryLabels;
        let isHorizontal: boolean = labelSettings.orientation === LabelOrientation.Horizontal;

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

    // public static renderDataLabelsBackgroundForSmallMultiple(
    //     data: VisualData,
    //     settings: VisualSettings,
    //     dataLabelsBackgroundContext: d3.Selection<any>,
    //     dataPoints: VisualDataPoint[] = null): void {
    //
    //     let labelSettings: categoryLabelsSettings = settings.categoryLabels;
    //
    //     dataLabelsBackgroundContext.selectAll("*").remove();
    //
    //     if (!labelSettings.showBackground) {
    //         return;
    //     }
    //
    //     let dataPointsArray: VisualDataPoint[] = this.filterData(dataPoints || data.dataPoints),
    //         backgroundSelection: UpdateSelection<VisualDataPoint> = dataLabelsBackgroundContext
    //             .selectAll(RenderVisual.Label.selectorName)
    //             .data(dataPointsArray);
    //
    //     backgroundSelection
    //         .enter()
    //         .append("svg:rect");
    //
    //     backgroundSelection
    //         .attr({
    //             height: d => {
    //                 return d.labelCoordinates.height + DataLabelHelper.labelBackgroundHeightPadding;
    //             },
    //             width: d => {
    //                 return d.labelCoordinates.width + DataLabelHelper.labelBackgroundWidthPadding;
    //             },
    //             x: d => {
    //                 return d.labelCoordinates.x - DataLabelHelper.labelBackgroundXShift;
    //             },
    //             y: d => {
    //                 return d.labelCoordinates.y - d.labelCoordinates.height - DataLabelHelper.labelBackgroundYShift;
    //             },
    //             rx: 4,
    //             ry: 4,
    //             fill: settings.categoryLabels.backgroundColor
    //         });
    //
    //     backgroundSelection.style({
    //         "fill-opacity": (100 - settings.categoryLabels.transparency) / 100,
    //         "pointer-events": "none"
    //     });
    //
    //     backgroundSelection
    //         .exit()
    //         .remove();
    // }

    // public static renderDataLabels(
    //     dataPoints: VisualDataPoint[],
    //     settings: VisualSettings,
    //     dataLabelsContext: d3.Selection<any>): void {
    //
    //     let labelSettings: categoryLabelsSettings = settings.categoryLabels;
    //
    //     dataLabelsContext.selectAll("*").remove();
    //
    //     if (!labelSettings.show) {
    //         return;
    //     }
    //
    //     let labelSelection: UpdateSelection<VisualDataPoint> = dataLabelsContext
    //         .selectAll(RenderVisual.Label.selectorName)
    //         .data(dataPoints);
    //
    //     let precision: number = labelSettings.precision;
    //
    //     let precisionZeros: string = "";
    //
    //     for (let i = 0; i < precision; ++i) {
    //         precisionZeros += "0";
    //     }
    //
    //     let dataLabelFormatter: IValueFormatter = ValueFormatter.create({
    //         precision: precision,
    //         format: `0.${precisionZeros}%;-0.${precisionZeros}%;0.${precisionZeros}%`
    //     });
    //
    //     labelSelection
    //         .enter()
    //         .append("svg:text");
    //
    //     let fontSizeInPx: string = PixelConverter.fromPoint(labelSettings.fontSize);
    //     let fontFamily: string = labelSettings.fontFamily ? labelSettings.fontFamily : dataLabelUtils.LabelTextProperties.fontFamily;
    //
    //     labelSelection
    //         .attr("transform", (p: VisualDataPoint) => {
    //             return translate(p.labelCoordinates.x, p.labelCoordinates.y) + (labelSettings.orientation === LabelOrientation.Horizontal ? "" : "rotate(-90)");
    //         });
    //
    //     labelSelection
    //         .style({
    //             "fill": labelSettings.color,
    //             "font-size": fontSizeInPx,
    //             "font-family": fontFamily,
    //             "pointer-events": "none"
    //         })
    //         .text((p: VisualDataPoint) => dataLabelFormatter.format(p.percentValue));
    //
    //     labelSelection
    //         .exit()
    //         .remove();
    // }
    //
    // public static renderDataLabelsForSmallMultiple(
    //     data: VisualData,
    //     settings: VisualSettings,
    //     dataLabelsContext: d3.Selection<any>,
    //     metadata: VisualMeasureMetadata,
    //     dataPoints: VisualDataPoint[] = null): void {
    //
    //     let labelSettings: categoryLabelsSettings = settings.categoryLabels;
    //
    //     dataLabelsContext.selectAll("*").remove();
    //
    //     if (!labelSettings.show) {
    //         return;
    //     }
    //
    //     let dataPointsArray: VisualDataPoint[] = this.filterData(dataPoints || data.dataPoints),
    //         labelSelection: UpdateSelection<VisualDataPoint> = dataLabelsContext
    //             .selectAll(RenderVisual.Label.selectorName)
    //             .data(dataPointsArray);
    //
    //     let dataLabelFormatter: IValueFormatter =
    //         formattingUtils.createFormatter(labelSettings.displayUnits,
    //             labelSettings.precision,
    //             metadata.cols.value,
    //             formattingUtils.getValueForFormatter(data));
    //
    //     labelSelection
    //         .enter()
    //         .append("svg:text");
    //
    //     let fontSizeInPx: string = PixelConverter.fromPoint(labelSettings.fontSize);
    //     let fontFamily: string = labelSettings.fontFamily ? labelSettings.fontFamily : dataLabelUtils.LabelTextProperties.fontFamily;
    //
    //     labelSelection
    //         .attr("transform", (p: VisualDataPoint) => {
    //             return translate(p.labelCoordinates.x, p.labelCoordinates.y);
    //         });
    //
    //     labelSelection
    //         .style({
    //             "fill": labelSettings.color,
    //             "font-size": fontSizeInPx,
    //             "font-family": fontFamily,
    //             "pointer-events": "none"
    //         })
    //         .text((p: VisualDataPoint) => dataLabelFormatter.format(p.value));
    //
    //     labelSelection
    //         .exit()
    //         .remove();
    // }
    //
    // public static renderSmallMultipleTopTitle(options: SmallMultipleOptions, settings: smallMultipleSettings) {
    //     let uniqueColumns: PrimitiveValue[] = options.columns,
    //         index: number = options.index,
    //         chartSize: ISize = options.chartSize,
    //         chartElement: d3.Selection<any> = options.chartElement,
    //         leftSpace: number = options.leftSpace,
    //         topSpace: number = options.topSpace,
    //         textHeight: number = options.textHeight,
    //         fontSizeInPx: string = PixelConverter.fromPoint(settings.fontSize),
    //         fontFamily: string = settings.fontFamily;
    //
    //     let topTitles: d3.Selection<SVGElement> = chartElement.append("svg");
    //     let topTitlestext: d3.selection.Update<PrimitiveValue> = topTitles.selectAll("*").data([uniqueColumns[index]]);
    //
    //     topTitlestext.enter()
    //         .append("text")
    //         .attr("class", Selectors.AxisLabelSelector.className);
    //
    //     // For removed categories, remove the SVG group.
    //     topTitlestext.exit()
    //         .remove();
    //
    //     let textProperties: TextProperties = {
    //         fontFamily,
    //         fontSize: fontSizeInPx
    //     };
    //
    //     topTitlestext
    //         .style({
    //             "text-anchor": "middle",
    //             "font-size": fontSizeInPx,
    //             "font-family": fontFamily,
    //             "fill": settings.fontColor
    //         })
    //         .attr({
    //             dy: "0.3em"
    //         })
    //         .text(d => {
    //             if (d || d === 0) {
    //                 textProperties.text = d.toString();
    //                 return TextMeasurementService.getTailoredTextOrDefault(textProperties, chartSize.width - 10);
    //             }
    //
    //             return null;
    //         })
    //         .call((text: d3.Selection<any>) => {
    //             const textSelectionX: d3.Selection<any> = d3.select(text[0][0]);
    //             let x = leftSpace + chartSize.width / 2;
    //
    //             textSelectionX.attr({
    //                 "transform": svg.translate(x, topSpace + textHeight / 2)
    //             });
    //         });
    // }

    public static filterData(dataPoints: VisualDataPoint[]): VisualDataPoint[] {
        let filteredDatapoints: VisualDataPoint[] = [];
        let validCoordinatesDataPoints: VisualDataPoint[] = dataPoints.filter(x => x.labelCoordinates && !isNaN(x.percentValue));

        for (let index in validCoordinatesDataPoints) {
            let dataPoint = validCoordinatesDataPoints[index];
            let coords: Coordinates = dataPoint.labelCoordinates;
            let isIntersected: boolean = false;

            for (let i in filteredDatapoints) {
                let filteredDatapoint: VisualDataPoint = filteredDatapoints[i];
                let filteredCoods: Coordinates = filteredDatapoint.labelCoordinates;

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

        let y = axes.y.scale(yValue);
        let x = axes.x.scale(axes.x.dataDomain[0]);

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

        let textProperties: TextProperties = {
            fontFamily: "wf_standard-font, helvetica, arial, sans-serif",
            fontSize: "10px"
        };

        let text: string = this.getLineText(settings);
        let textWidth: number = textMeasurementService.measureSvgTextWidth(textProperties, text);
        let textHeight: number = textMeasurementService.estimateSvgTextHeight(textProperties);

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
        let displayUnits: number = settings.displayUnits;
        let precision: number = settings.precision;

        let formatter = valueFormatter.create({
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

        let minPosition: number = axes.y.scale(axes.y.dataDomain[0]);
        let maxPosition: number = axes.y.scale(axes.y.dataDomain[1]);

        if (positionAcross <= minPosition) {
            positionAcross = minPosition + marginAcross;
        } else if (positionAcross >= maxPosition) {
            positionAcross = maxPosition - (textHeight + marginAcross);
        }

        return translate(positionAlong, positionAcross);
    }

    // private static gapBetweenCharts: number = 10;
    //
    // public static renderSmallMultipleLines(options: SmallMultipleOptions, settings: smallMultipleSettings) {
    //
    //     let uniqueRows: PrimitiveValue[] = options.rows,
    //         uniqueColumns: PrimitiveValue[] = options.columns,
    //         chartSize: ISize = options.chartSize,
    //         chartElement: d3.Selection<any> = options.chartElement,
    //         leftSpace: number = options.leftSpace,
    //         topSpace: number = options.topSpace,
    //         rowsInFlow: number = options.rowsInFlow;
    //
    //     for (let i = 1; i < uniqueRows.length; ++i) {
    //         let y: number = 0;
    //         if (settings.layoutMode === LayoutMode.Matrix) {
    //             y = topSpace * 2 + i * chartSize.height + this.gapBetweenCharts * (i - 1);
    //         } else {
    //             y = topSpace * i * rowsInFlow + i * chartSize.height * rowsInFlow + this.gapBetweenCharts * (i * rowsInFlow - 1) + this.gapBetweenCharts / 2;
    //         }
    //
    //         let line = chartElement.append("line").style({
    //             "stroke": "#aaa",
    //             "stroke-width": 1
    //         });
    //
    //         line.attr({
    //             x1: 0,//leftSpace + gapBetweenCharts / 2,
    //             x2: leftSpace + uniqueColumns.length * chartSize.width + this.gapBetweenCharts * uniqueColumns.length,
    //             y1: y,
    //             y2: y
    //         });
    //     }
    //
    //     if (settings.layoutMode === LayoutMode.Matrix) {
    //         for (let j = 1; j < uniqueColumns.length; ++j) {
    //             let x = leftSpace + j * chartSize.width + this.gapBetweenCharts * j;
    //
    //             let line = chartElement.append("line").style({
    //                 "stroke": "#aaa",
    //                 "stroke-width": 1
    //             });
    //
    //             line.attr({
    //                 x1: x,
    //                 x2: x,
    //                 y1: 0,
    //                 y2: topSpace + uniqueRows.length * chartSize.height + this.gapBetweenCharts * uniqueRows.length
    //             });
    //         }
    //     }
    // }
    //
    // public static renderSmallMultipleTitles(options: SmallMultipleOptions, settings: smallMultipleSettings) {
    //     let uniqueColumns: PrimitiveValue[] = options.columns,
    //         uniqueRows: PrimitiveValue[] = options.rows,
    //         chartSize: ISize = options.chartSize,
    //         chartElement: d3.Selection<any> = options.chartElement,
    //         leftSpace: number = options.leftSpace,
    //         topSpace: number = options.topSpace,
    //         fontSizeInPx: string = PixelConverter.fromPoint(settings.fontSize),
    //         fontFamily: string = settings.fontFamily,
    //         rowsInFlow: number = options.rowsInFlow;
    //
    //     if (settings.layoutMode === LayoutMode.Matrix) {
    //         let topTitles: d3.Selection<SVGElement> = chartElement.append("svg");
    //         let topTitlestext: d3.selection.Update<PrimitiveValue> = topTitles.selectAll("*").data(uniqueColumns);
    //
    //         topTitlestext.enter()
    //             .append("text")
    //             .attr("class", Selectors.AxisLabelSelector.className);
    //
    //         // For removed categories, remove the SVG group.
    //         topTitlestext.exit()
    //             .remove();
    //
    //         let textProperties: TextProperties = {
    //             fontFamily,
    //             fontSize: fontSizeInPx
    //         };
    //
    //         topTitlestext
    //             .style({
    //                 "text-anchor": "middle",
    //                 "font-size": fontSizeInPx,
    //                 "font-family": fontFamily,
    //                 "fill": settings.fontColor
    //             })
    //             .attr({
    //                 dy: "1em"
    //             })
    //             .text(d => {
    //                 if (d || d === 0) {
    //                     textProperties.text = d.toString();
    //                     return TextMeasurementService.getTailoredTextOrDefault(textProperties, chartSize.width - 10);
    //                 }
    //
    //                 return null;
    //             })
    //             .call((text: d3.Selection<any>) => {
    //                 for (let j = 0; j < uniqueColumns.length; ++j) {
    //                     const textSelectionX: d3.Selection<any> = d3.select(text[0][j]);
    //                     let x = leftSpace + j * chartSize.width + chartSize.width / 2 + this.gapBetweenCharts * j;
    //
    //                     textSelectionX.attr({
    //                         "transform": svg.translate(x, topSpace / 2)
    //                     });
    //                 }
    //             });
    //     }
    //
    //     const leftTitleSpace: number = 120;
    //
    //     let textProperties: TextProperties = {
    //         fontFamily,
    //         fontSize: fontSizeInPx
    //     };
    //
    //     let leftTitles: d3.Selection<SVGElement> = chartElement.append("svg");
    //     let leftTitlesText: d3.selection.Update<PrimitiveValue> = leftTitles.selectAll("*").data(uniqueRows);
    //
    //     leftTitlesText.enter()
    //         .append("text")
    //         .attr("class", Selectors.AxisLabelSelector.className);
    //
    //     // For removed categories, remove the SVG group.
    //     leftTitlesText.exit()
    //         .remove();
    //
    //     leftTitlesText
    //         .style({
    //             "text-anchor": "middle",
    //             "font-size": fontSizeInPx,
    //             "font-family": fontFamily,
    //             "fill": settings.fontColor
    //         })
    //         .text(d => {
    //             if (d || d === 0) {
    //                 textProperties.text = d.toString();
    //                 return TextMeasurementService.getTailoredTextOrDefault(textProperties, leftTitleSpace);
    //             }
    //
    //             return null;
    //         })
    //         .call((text: d3.Selection<any>) => {
    //             for (let i = 0; i < uniqueRows.length; ++i) {
    //                 const textSelectionX: d3.Selection<any> = d3.select(text[0][i]);
    //                 let y = 0;
    //
    //                 if (settings.layoutMode === LayoutMode.Flow) {
    //
    //                     let previousChartGroupHeight: number = i * rowsInFlow * chartSize.height + this.gapBetweenCharts * i * rowsInFlow + topSpace * rowsInFlow * i;
    //                     y = previousChartGroupHeight + rowsInFlow * chartSize.height / 2 + topSpace;
    //                 } else {
    //                     y = i * chartSize.height + chartSize.height / 2 + topSpace * 2 + this.gapBetweenCharts * i;
    //                 }
    //
    //                 textSelectionX.attr({
    //                     "transform": svg.translate(leftSpace / 2, y)
    //                 });
    //             }
    //         });
    // }
}
