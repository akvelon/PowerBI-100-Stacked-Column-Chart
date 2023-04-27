"use strict";

import {DataViewObjectsParser} from "powerbi-visuals-utils-dataviewutils/lib/dataViewObjectsParser";

const DefaultFontFamily: string = "\"Segoe UI\", wf_segoe-ui_normal, helvetica, arial, sans-serif";

export class VisualSettings extends DataViewObjectsParser {
    public selectionSaveSettings = {
        selection: []
    };
    public dataPoint = new DataPointSettings();
    public smallMultiple = new SmallMultipleSettings();
    public legend = new LegendSettings();
    public categoryAxis = new CategoryAxisSettings();
    public valueAxis = new ValueAxisSettings();
    public categoryLabels = new CategoryLabelsSettings();
    public constantLine: ConstantLineSettings = new ConstantLineSettings();
}

export const enum AxisRangeType {
    Common = "common",
    Separate = "separate",
    Custom = "custom",
}

export const enum LayoutMode {
    Flow = "flow",
    Matrix = "matrix",
}

export const enum LabelPosition {
    Auto = "auto",
    InsideEnd = "end",
    InsideBase = "base",
    InsideCenter = "center",
}

export const enum LabelOrientation {
    Vertical = "vertical",
    Horizontal = "horizontal"
}


export class DataPointSettings {
    // Fill
    public fill: string = "#01b8aa";
    // Show all
    public showAllDataPoints: boolean = true;
}

export const enum LineStyle {
    Dashed = "dashed",
    Solid = "solid",
    Dotted = "dotted",
}

export const enum Position {
    Behind = "behind",
    InFront = "front",
}

export const enum Text {
    Name = "name",
    Value = "value",
    NameAndValue = "nameAndValue",
}

export const enum HorizontalPosition {
    Left = "left",
    Right = "right",
}

export const enum VerticalPosition {
    Top = "top",
    Bottom = "bottom",
}

export class LegendSettings {
    // Show legend
    public show: boolean = true;
    // Position
    public position: string = "Top";
    // Show title
    public showTitle: boolean = true;
    // Legend Name
    public legendName: string = "";
    // Legend Name Fill
    public legendNameColor: string = "";
    // Legend Font Family
    public fontFamily: string = DefaultFontFamily;
    // Legend Font Size
    public fontSize: number = 8;
}

export class CategoryAxisSettings {
    // Show category axis
    public show: boolean = true;
    // Position
    public position: string = "top";
    // Axis type
    public axisType: string = "categorical";
    // Axis Scale type
    public axisScale: string = "linear";
    public rangeType: AxisRangeType = AxisRangeType.Common;
    public rangeTypeNoScalar: AxisRangeType = AxisRangeType.Common;
    // Axis start
    public start: number = null;
    // Axis end
    public end: number = null;
    // Axis color
    public axisColor: string = "";
    // Axis Font Size
    public fontSize: number = 11;
    // Axis Font Family
    public fontFamily: string = DefaultFontFamily;
    // Display Units
    public displayUnits: number = 0;
    // valueDecimalPlaces
    public precision: number = null;
    // Minimum category width
    public minCategoryWidth: number = 20;
    // Minimum category width
    public maximumSize: number = 25;
    // Minimum category width
    public innerPadding: number = 20;
    // Show title
    public showTitle: boolean = false;

    public titleStyle: string = "showTitleOnly";
    public axisTitleColor: string = "";
    public axisTitle: string = "";
    public titleFontSize: number = 11;
    public titleFontFamily: string = DefaultFontFamily;
}

export class ValueAxisSettings {
    // Show category axis
    public show: boolean = true;
    // Position
    public position: string = "left";
    // Axis Scale type
    public axisScale: string = "linear";
    public rangeType: AxisRangeType = AxisRangeType.Common;
    // Axis start
    public start: number = null;
    // Axis end
    public end: number = null;
    // Axis color
    public axisColor: string = "";
    // Axis Font Size
    public fontSize: number = 11;
    // Axis Font Family
    public fontFamily: string = DefaultFontFamily;
    // Display Units
    public displayUnits: number = 0;
    // valueDecimalPlaces
    public precision: number = null;
    // Show Title
    public showTitle: boolean = false;

    public titleStyle: string = "showTitleOnly";
    public axisTitleColor: string = "";
    public axisTitle: string = "";
    public titleFontSize: number = 11;
    public titleFontFamily: string = DefaultFontFamily;
    // Show Gridlines
    public showGridlines: boolean = true;

    public gridlinesColor: string = "";
    public strokeWidth: number = 1;
    public lineStyle: string = "solid";
}

export class CategoryLabelsSettings {
    // Show category axis
    public show: boolean = false;
    // Axis color
    public color: string = "";
    // Display Units
    public displayUnits: number = 0;
    // Value decimal places
    public precision: number = 0;
    public orientation: LabelOrientation = LabelOrientation.Horizontal;
    // Category labels position
    public labelPosition: LabelPosition = LabelPosition.Auto;
    // Overflow text
    public overflowText: boolean = false;
    // Axis Font Size
    public fontSize: number = 9;
    // Axis Font Family
    public fontFamily: string = DefaultFontFamily;
    // Show Background
    public showBackground: boolean = false;
    // Show Background transparency
    public transparency: number = 90;
    // Show Background transparency
    public backgroundColor: string = "";
}

export class ConstantLineSettings {
    public show: boolean = false;
    public name: string = "";
    public value: number = 0;
    public lineColor: string = "#01b8aa";
    public transparency: number = 90;
    public lineStyle: LineStyle = LineStyle.Dotted;
    public position: Position = Position.Behind;
    public dataLabelShow: boolean = false;
    public fontColor: string = "#01b8aa";
    public text: Text = Text.Name;
    public horizontalPosition: HorizontalPosition = HorizontalPosition.Left;
    public verticalPosition: VerticalPosition = VerticalPosition.Top;
    public displayUnits: number = 0;
    public precision: number = null;
}

export class SmallMultipleSettings {
    public layoutMode: LayoutMode = LayoutMode.Flow;
    public minUnitWidth: number = 150;
    public minUnitHeight: number = 120;
    public maxRowWidth: number = 4;
    public showChartTitle: boolean = true;
    public textcolor: string = "#000000";
    public fontFamily: string = DefaultFontFamily;
    public fontSize: number = 9;
    public fontColor: string = "#000000";
    public showSeparators: boolean = true;
}
