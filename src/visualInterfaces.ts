"use strict";

import powerbiApi from "powerbi-visuals-api";
import {axisInterfaces, legendInterfaces} from "powerbi-visuals-utils-chartutils";
import {interactivitySelectionService} from "powerbi-visuals-utils-interactivityutils";
import {ISelectionHandler} from "powerbi-visuals-utils-interactivityutils/lib/interactivityBaseService";
import {Selection} from "d3-selection";

import {VisualSettings} from "./settings";
import {ScrollBar} from "./scrollbarUtil";

import DataView = powerbiApi.DataView;
import PrimitiveValue = powerbiApi.PrimitiveValue;
import ISelectionId = powerbiApi.extensibility.ISelectionId;
import DataViewValueColumn = powerbiApi.DataViewValueColumn;
import DataViewValueColumns = powerbiApi.DataViewValueColumns;
import DataViewMetadataColumn = powerbiApi.DataViewMetadataColumn;
import DataViewObject = powerbiApi.DataViewObject;
import VisualTooltipDataItem = powerbiApi.extensibility.VisualTooltipDataItem;
import IVisual = powerbiApi.extensibility.IVisual;
import IViewport = powerbiApi.IViewport;
import IAxisProperties = axisInterfaces.IAxisProperties;
import SelectableDataPoint = interactivitySelectionService.SelectableDataPoint;
import LegendData = legendInterfaces.LegendData;

export type d3Selection<T> = Selection<any, T, any, any>;

export interface IMargin {
    top: number;
    bottom: number;
    left: number;
    right: number;
}

export interface ISize {
    width: number;
    height: number;
}

export interface SmallMultipleSizeOptions extends ISize {
    isVerticalSliderNeeded: boolean;
    isHorizontalSliderNeeded: boolean;
}

export interface IAxes {
    x: IAxisProperties;
    y: IAxisProperties;
    xIsScalar?: boolean;
}

//     export interface VisualDataRow {
//         rects: VisualDataRect[];
//         category: PrimitiveValue;
//     }
//
//     export interface VisualDataRect {
//         value: PrimitiveValue;
//         color?: string;
//         selectionId?: ISelectionId;
//     }

export class VisualColumns {
    public Axis: DataViewValueColumn | null = null;
    public Legend: DataViewValueColumn | null = null;
    public Value: DataViewValueColumn[] | DataViewValueColumn | null = null;
    public ColorSaturation: DataViewValueColumn | null = null;
    public Tooltips: DataViewValueColumn[] | DataViewValueColumn | null = null;
    public ColumnBy: DataViewValueColumn | null = null;
    public RowBy: DataViewValueColumn | null = null;
    public GroupedValues: DataViewValueColumns | null = null;
}

export interface VisualDataPoint extends SelectableDataPoint {
    value: number;
    percentValueForHeight: number;
    percentValue: number;
    category: PrimitiveValue | number;
    shiftValue?: number;
    sum?: number;
    colorSaturation?: number;
    tooltips?: VisualTooltipDataItem[];
    series?: PrimitiveValue;
    color?: string;
    selectionId?: ISelectionId;
    highlight?: boolean;
    fill?: string;
    barCoordinates?: Coordinates;
    labelCoordinates?: Coordinates;
    columnBy?: PrimitiveValue;
    rowBy?: PrimitiveValue;
    preSelected?: boolean;
    preRemoved?: boolean;
}

export interface Coordinates {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface VisualData {
    dataPoints: VisualDataPoint[];
    legendData: LegendData;
    hasHighlight: boolean;
    isLegendNeeded: boolean;
    size?: ISize;
    axes: IAxes;
    categoriesCount: number;
    isSmallMultiple: boolean;
}

export interface IAxesSize {
    xAxisHeight: number;
    yAxisWidth: number;
}

export interface VisualMeasureMetadata {
    idx: VisualMeasureMetadataIndexes;
    cols: VisualMeasureMetadataColumns;
    labels: VisualAxesLabels;
    groupingColumn: DataViewMetadataColumn;
}

export interface VisualMeasureMetadataIndexes {
    category?: number;
    value?: number;
    y?: number;
    gradient?: number;
    columnBy?: number;
    rowBy?: number;
}

export interface VisualMeasureMetadataColumns {
    value?: DataViewMetadataColumn;
    category?: DataViewMetadataColumn;
}

export interface VisualAxesLabels {
    x: string;
    y: string;
}

export interface LegendSize {
    width: number;
    height: number;
}

export interface VisualTranslation {
    x: number;
    y: number;
}

export interface CategoryDataPoints {
    categoryName: string;
    dataPoints: VisualDataPoint[];
}

export interface AxesDomains {
    yAxisDomain: number[];
    xAxisDomain: number[];
}

//     export enum ScrollableAxisName {
//         X = <any>'x',
//         Y = <any>'y'
//     }

export type SelectionState = undefined | null | 'selected' | 'justSelected' | 'justRemoved';

export interface LegendProperties {
    legendObject: DataViewObject;
    data: LegendData;
    colors: string[];
}

//     export interface ChartOptions {
//         maxYLabelWidth
//     }

export interface SmallMultipleOptions {
    rows: PrimitiveValue[],
    columns: PrimitiveValue[],
    chartSize: ISize,
    leftSpace: number,
    topSpace: number,
    textHeight?: number,
    chartElement: d3Selection<any>,
    xAxisLabelSize: number,
    index?: number,
    rowsInFlow?: number
}

export interface IColumnVisual extends IVisual {
    axesSize: IAxesSize;
    yTickOffset: number;
    webBehaviorSelectionHandler: ISelectionHandler;
    settings: VisualSettings;
    visualSize: ISize;
    viewport: IViewport;
    legendSize: LegendSize;
    visualMargin: IMargin;
    categoriesCount: number;
    scrollBar: ScrollBar;
    barClassName: string;

    onScrollPosChanged(): void;

    getDataPointsByCategories(): CategoryDataPoints[];

    getAllDataPoints(): VisualDataPoint[];

    getVisualTranslation(): VisualTranslation;

    getSettings(): VisualSettings;

    saveSelection(): void;

    getDataView(): DataView;
}
