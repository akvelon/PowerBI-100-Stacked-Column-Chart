"use strict";

import powerbi from "powerbi-visuals-api";

import DataView = powerbi.DataView;
import DataViewCategoricalColumn = powerbi.DataViewCategoricalColumn;
import DataViewValueColumns = powerbi.DataViewValueColumns;
import DataViewMetadataColumn = powerbi.DataViewMetadataColumn;

export const enum Field {
    Axis = "Axis",
    Legend = "Legend",
    Value = "Value",
    Gradient = "Gradient",
    ColumnBy = "ColumnBy",
    RowBy = "RowBy",
    Tooltips = "Tooltips",
    GroupedValues = "GroupedValues",
}

export class DataViewConverter<T> {
//         private static Highlighted: string = "Highlighted";
//         private static Blank: string = "(Blank)";
//         private static percentFormatString: string = "#,0.00%";
//         public static Convert(dataView: DataView, hostService: IVisualHost, settings: VisualSettings, legendColors: Array<string>): VisualDataPoint[] {
//
//             if (this.IsAxisAndLegendSameField(dataView)) {
//                 return this.GetDataPointsForSameAxisAndLegend(dataView, hostService, legendColors);
//             } else if (this.IsLegendFilled(dataView)) {
//                 return this.GetDataPointsForLegend(dataView, hostService, legendColors);
//             } else if (this.IsMultipleValues(dataView)) {
//                 return this.GetDataPointsForMultipleValues(dataView, hostService, legendColors);
//             }
//
//             return this.GetDataPointsWithoutLegend(dataView, hostService, settings);
//         }

    public static IsLegendNeeded(dataView: DataView) {
        return this.IsLegendFilled(dataView) || this.IsMultipleValues(dataView);
    }

//         public static IsAxisFilled(dataView: DataView): boolean {
//             if (dataView.categorical
//                 && dataView.categorical.values
//                 && dataView.categorical.values.source
//                 && dataView.categorical.values.source.roles[Field.Axis]) {
//                 return true;
//             }
//
//             const columns: DataViewCategoricalColumn[] = dataView.categorical.categories;
//
//             if (columns && columns.filter(x => x.source && x.source.roles[Field.Axis]).length) {
//                 return true;
//             }
//
//             return false;
//         }

    public static IsCategoryFilled(dataView: DataView, categoryField: Field): boolean {
        if (dataView.categorical
            && dataView.categorical.values
            && dataView.categorical.values.source
            && dataView.categorical.values.source.roles[categoryField]) {
            return true;
        }

        const columns: DataViewCategoricalColumn[] = dataView.categorical.categories;

        if (columns && columns.filter(x => x.source && x.source.roles[categoryField]).length) {
            return true;
        }

        return false;
    }

//         public static IsValueFilled(dataView: DataView): boolean {
//             const columns: DataViewValueColumns = dataView.categorical.values;
//
//             if (!columns) {
//                 return false;
//             }
//
//             if (columns.source && columns.source.roles[Field.Value] || columns.filter(x => x.source && x.source.roles[Field.Value]).length) {
//                 return true;
//             }
//
//             return false;
//         }
//
//         private static IsAxisAndLegendSameField(dataView: DataView): boolean {
//             const columns: DataViewValueColumns = dataView.categorical.values;
//
//             if (columns.source && columns.source.roles[Field.Legend] && columns.source.roles[Field.Axis]) {
//                 return true;
//             }
//
//             return false;
//         }

    public static IsLegendFilled(dataView: DataView): boolean {
        const columns: DataViewValueColumns = dataView.categorical.values;

        if (columns.source && columns.source.roles[Field.Legend]) {
            return true;
        }

        return false;
    }

    public static IsMultipleValues(dataView: DataView): boolean {
        const columns: DataViewMetadataColumn[] = dataView.metadata.columns;
        let valueFieldsCount: number = 0;

        for (let columnName in columns) {
            const column: DataViewMetadataColumn = columns[columnName];

            if (column.roles && column.roles[Field.Value]) {
                ++valueFieldsCount;
                if (valueFieldsCount > 1) {
                    return true;
                }
            }
        }

        return false;
    }

//         // Legend bucket is filled
//         private static GetDataPointsForSameAxisAndLegend(dataView: DataView, hostService: IVisualHost, legendColors: Array<string>): VisualDataPoint[] {
//             let columns: VisualColumns = this.GetGroupedValueColumns(dataView);
//
//             let data: VisualDataPoint[] = [];
//
//             let seriesColumn: DataViewValueColumns = columns[Field.GroupedValues];
//             let groupedValues: DataViewValueColumnGroup[] = seriesColumn.grouped ? seriesColumn.grouped() : null;
//
//             columns[Field.Legend].forEach((legend, k) => {
//                 let value: number = columns[Field.Value][k].values[0];
//                 let color = legendColors[k];
//
//                 let tooltipItems: VisualTooltipDataItem[] = [];
//
//                 const groupMetadata: DataViewMetadataColumn = columns[Field.GroupedValues].source,
//                     valueMetadata: DataViewMetadataColumn = columns[Field.Value][k].source;
//
//                 tooltipItems.push(this.createTooltipData(groupMetadata, legend));
//                 tooltipItems.push(this.createPercentTooltipData(valueMetadata, value, 1));
//
//                 if (columns[Field.Tooltips] && columns[Field.Tooltips].length) {
//                     columns[Field.Tooltips].filter(x => x.source.groupName === legend).forEach(tooltipColumn => {
//                         const tooltipValue = tooltipColumn.values[k],
//                             tooltipMetadata: DataViewMetadataColumn = tooltipColumn.source;
//
//                         tooltipItems.push(this.createTooltipData(tooltipMetadata, tooltipValue));
//                     });
//                 }
//
//                 let identity: ISelectionId = hostService.createSelectionIdBuilder()
//                     .withSeries(columns[Field.GroupedValues], groupedValues[k])
//                     .withMeasure(seriesColumn[k].source.queryName)
//                     .createSelectionId();
//
//                 if (value != null) {
//                     data.push({
//                         category: legend !== 0 && !legend ? this.Blank : legend,
//                         series: legend,
//                         value: value,
//                         percentValueForHeight: 1,
//                         shiftValue: value >= 0 ? 0 : -1,
//                         percentValue: 1,
//                         selected: false,
//                         identity: identity,
//                         color: color,
//                         tooltips: tooltipItems
//                     });
//
//                     let highlightValue: number = columns[Field.Value][k].highlights ? columns[Field.Value][k].highlights[0] : null;
//
//                     if (highlightValue != null) {
//                         let highlightTooltipItems: VisualTooltipDataItem[] = tooltipItems.slice();
//
//                         highlightTooltipItems.push(this.createPercentTooltipData(valueMetadata, highlightValue, 1, this.Highlighted));
//
//                         data.push({
//                             category: legend !== 0 && !legend ? this.Blank : legend,
//                             series: legend,
//                             value: highlightValue,
//                             percentValue: 1,
//                             percentValueForHeight: 1,
//                             shiftValue: highlightValue >= 0 ? 0 : -1,
//                             selected: false,
//                             identity: identity,
//                             highlight: true,
//                             color: color,
//                             tooltips: highlightTooltipItems
//                         });
//                     }
//                 }
//             });
//
//             return data;
//         }
//
//         // Legend bucket is filled
//         private static GetDataPointsForLegend(dataView: DataView, hostService: IVisualHost, legendColors: Array<string>): VisualDataPoint[] {
//             let columns: VisualColumns = this.GetGroupedValueColumns(dataView);
//
//             let data: VisualDataPoint[] = [];
//
//             let categoryColumn: DataViewCategoryColumn = columns[Field.Axis][0],
//                 seriesColumn: DataViewValueColumns = columns[Field.GroupedValues],
//                 groupedValues: DataViewValueColumnGroup[] = seriesColumn.grouped ? seriesColumn.grouped() : null;
//
//             categoryColumn.values.forEach((categoryValue, i) => {
//                 let sum: number = 0;
//                 let negativeSum: number = 0;
//
//                 let columnBy: PrimitiveValue = columns[Field.ColumnBy] && columns[Field.ColumnBy][0].values[i],
//                     rowBy: PrimitiveValue = columns[Field.RowBy] && columns[Field.RowBy][0].values[i];
//
//                 let categorySum: number = d3.sum(columns[Field.Value].map(x => x.values[i] >= 0 ? x.values[i] : -x.values[i]));
//
//                 columns[Field.Legend].forEach((legend, k) => {
//                     let value: number = columns[Field.Value][k].values[i];
//                     let percentageValue: number = value / categorySum;
//                     let color = legendColors[k];
//
//                     let identity: ISelectionId = hostService.createSelectionIdBuilder()
//                         .withCategory(categoryColumn, i)
//                         .withSeries(seriesColumn, groupedValues[k])
//                         .withMeasure(seriesColumn[k].source.queryName)
//                         .createSelectionId();
//
//                     if (value != null) {
//                         let tooltipItems: VisualTooltipDataItem[] = [];
//
//                         const categoryMetadata: DataViewMetadataColumn = categoryColumn.source,
//                             groupMetadata: DataViewMetadataColumn = columns[Field.GroupedValues].source,
//                             valueMetadata: DataViewMetadataColumn = columns[Field.Value][k].source;
//
//                         tooltipItems.push(this.createTooltipData(categoryMetadata, categoryValue));
//                         tooltipItems.push(this.createTooltipData(groupMetadata, legend));
//                         tooltipItems.push(this.createPercentTooltipData(valueMetadata, value, percentageValue));
//
//                         if (columns[Field.Tooltips] && columns[Field.Tooltips].length) {
//                             columns[Field.Tooltips].filter(x => x.source.groupName === legend).forEach(tooltipColumn => {
//                                 const tooltipValue = tooltipColumn.values[i],
//                                     tooltipMetadata: DataViewMetadataColumn = tooltipColumn.source;
//
//                                 tooltipItems.push(this.createTooltipData(tooltipMetadata, tooltipValue));
//                             });
//                         }
//
//                         data.push({
//                             category: categoryValue !== 0 && !categoryValue ? "(Blank)" : categoryValue,
//                             series: legend,
//                             value: value,
//                             percentValue: percentageValue,
//                             percentValueForHeight: percentageValue > 0 ? percentageValue : -percentageValue,
//                             shiftValue: value > 0 ? sum : negativeSum + percentageValue,
//                             selected: false,
//                             identity: identity,
//                             tooltips: tooltipItems,
//                             color: color,
//                             columnBy: columnBy,
//                             rowBy: rowBy
//                        });
//
//                         let highlightValue: number = columns[Field.Value][k].highlights ? columns[Field.Value][k].highlights[i] : null;
//
//                         if (highlightValue != null) {
//                             let highlightPercentage: number = highlightValue / categorySum;
//                             let highlightTooltipItems: VisualTooltipDataItem[] = tooltipItems.slice();
//
//                             highlightTooltipItems.push(this.createPercentTooltipData(valueMetadata, value, percentageValue, this.Highlighted));
//
//                             data.push({
//                                 category: categoryValue !== 0 && !categoryValue ? "(Blank)" : categoryValue,
//                                 series: legend,
//                                 value: highlightValue,
//                                 percentValue: highlightPercentage,
//                                 percentValueForHeight: highlightPercentage >= 0 ? highlightPercentage : -highlightPercentage,
//                                 shiftValue: highlightValue >= 0 ? sum : negativeSum,
//                                 selected: false,
//                                 identity: identity,
//                                 highlight: true,
//                                 tooltips: highlightTooltipItems,
//                                 color: color,
//                                 columnBy: columnBy,
//                                 rowBy: rowBy
//                             });
//                         }
//
//                         sum += percentageValue >= 0 ? percentageValue : 0;
//                         negativeSum += percentageValue < 0 ? percentageValue : 0;
//                     }
//                 });
//             });
//
//             return data;
//         }
//
//         // Legend bucket is empty. Used multiple fields in "Value" bucket
//         private static GetDataPointsForMultipleValues(dataView: DataView, hostService: IVisualHost, legendColors: Array<string>): VisualDataPoint[] {
//             let columns: VisualColumns = this.GetColumnsForMultipleValues(dataView);
//
//             let data: VisualDataPoint[] = [];
//
//             let categoryColumn: DataViewCategoryColumn = columns[Field.Axis][0];
//
//             categoryColumn.values.forEach((category, i) => {
//                 let sum: number = 0;
//                 let negativeSum: number = 0;
//
//                 let categorySum: number = d3.sum(columns[Field.Value].map(x => x.values[i] >= 0 ? x.values[i] : -x.values[i]));
//
//                 columns[Field.Value].forEach((valueColumn, k) => {
//                     let value: number = valueColumn.values[i];
//                     let color = legendColors[k];
//                     let percentageValue: number = value / categorySum;
//
//                     let columnBy: PrimitiveValue = columns[Field.ColumnBy] && columns[Field.ColumnBy][0].values[i],
//                         rowBy: PrimitiveValue = columns[Field.RowBy] && columns[Field.RowBy][0].values[i];
//
//                     let identity: ISelectionId = hostService.createSelectionIdBuilder()
//                         .withCategory(categoryColumn, i)
//                         .withMeasure(columns.Value[k].source.queryName)
//                         .createSelectionId();
//
//                     if (value != null) {
//                         let tooltipItems: VisualTooltipDataItem[] = [];
//
//                         const categoryMetadata: DataViewMetadataColumn = categoryColumn.source,
//                             valueMetadata: DataViewMetadataColumn = valueColumn.source;
//
//                         tooltipItems.push(this.createTooltipData(categoryMetadata, category));
//                         tooltipItems.push(this.createPercentTooltipData(valueMetadata, value, percentageValue));
//
//                         if (columns[Field.Tooltips] && columns[Field.Tooltips].length) {
//                             columns[Field.Tooltips].forEach(tooltipColumn => {
//                                 const tooltipValue = tooltipColumn.values[i],
//                                     tooltipMetadata: DataViewMetadataColumn = tooltipColumn.source;
//
//                                 tooltipItems.push(this.createTooltipData(tooltipMetadata, tooltipValue));
//                             });
//                         }
//
//                         data.push({
//                             category: category !== 0 && !category ? "(Blank)" : category,
//                             value: percentageValue,
//                             percentValue: percentageValue,
//                             percentValueForHeight: percentageValue > 0 ? percentageValue : -percentageValue,
//                             shiftValue: value > 0 ? sum : negativeSum + percentageValue,
//                             selected: false,
//                             identity: identity,
//                             tooltips: tooltipItems,
//                             color: color,
//                             columnBy: columnBy,
//                             rowBy: rowBy
//                         });
//
//                         let highlightValue: number = valueColumn.highlights ? valueColumn.highlights[i] : null;
//
//                         if (highlightValue != null) {
//                             let highlightPercentage: number = highlightValue / categorySum;
//                             let highlightTooltipItems: VisualTooltipDataItem[] = tooltipItems.slice();
//
//                             highlightTooltipItems.push(this.createPercentTooltipData(valueMetadata, highlightValue, highlightPercentage, this.Highlighted));
//
//                             data.push({
//                                 category: category !== 0 && !category ? "(Blank)" : category,
//                                 value: highlightPercentage,
//                                 percentValue: highlightPercentage,
//                                 percentValueForHeight: highlightPercentage >= 0 ? highlightPercentage : -highlightPercentage,
//                                 shiftValue: highlightPercentage >= 0 ? sum : negativeSum + highlightPercentage,
//                                 selected: false,
//                                 identity: identity,
//                                 highlight: true,
//                                 tooltips: tooltipItems,
//                                 color: color,
//                                 columnBy: columnBy,
//                                 rowBy: rowBy
//                             });
//                         }
//
//                         sum += percentageValue >= 0 ? percentageValue : 0;
//                         negativeSum += percentageValue < 0 ? percentageValue : 0;
//                     }
//                 });
//             });
//
//             return data;
//         }
//
//         // Legend bucket is empty. Single field in "Value" bucket
//         private static GetDataPointsWithoutLegend(dataView: DataView, hostService: IVisualHost, settings: VisualSettings): VisualDataPoint[] {
//             let columns: VisualColumns = this.GetColumnsWithNoLegend(dataView);
//
//             let data: VisualDataPoint[] = [];
//
//             let categoryColumn: DataViewCategoryColumn = columns[Field.Axis][0];
//
//             let colorHelper = new ColorHelper(
//                 hostService.colorPalette,
//                 {
//                     objectName: "dataPoint",
//                     propertyName: "fill"
//                 },
//                 settings.dataPoint.fill
//             );
//
//             categoryColumn.values.forEach((category, i) => {
//
//                 const value: number = columns[Field.Value].values[i],
//                     colorSaturationCol = columns[Field.Gradient],
//                     colorSaturation: number = colorSaturationCol && colorSaturationCol.values[i] ? columns[Field.Gradient].values[i] : null;
//
//                 let columnBy: PrimitiveValue = columns[Field.ColumnBy] && columns[Field.ColumnBy][0].values[i],
//                     rowBy: PrimitiveValue = columns[Field.RowBy] && columns[Field.RowBy][0].values[i];
//
//                 let identity: ISelectionId = hostService.createSelectionIdBuilder()
//                     .withCategory(categoryColumn, i)
//                     .createSelectionId();
//
//                 if (value != null) {
//                     let color = colorHelper.getColorForMeasure(
//                         categoryColumn.objects && categoryColumn.objects[i],
//                         "");
//
//                     let tooltipItems: VisualTooltipDataItem[] = [];
//
//                     const categoryMetadata: DataViewMetadataColumn = categoryColumn.source,
//                         valueMetadata: DataViewMetadataColumn = columns[Field.Value].source;
//
//                     tooltipItems.push(this.createTooltipData(categoryMetadata, category));
//                     tooltipItems.push(this.createPercentTooltipData(valueMetadata, value, 1));
//
//                     if (columns[Field.Tooltips] && columns[Field.Tooltips].length) {
//                         columns[Field.Tooltips].forEach(tooltipColumn => {
//                             const tooltipValue = tooltipColumn.values[i],
//                                 tooltipMetadata: DataViewMetadataColumn = tooltipColumn.source;
//
//                             tooltipItems.push(this.createTooltipData(tooltipMetadata, tooltipValue));
//                         });
//                     }
//
//                     data.push({
//                         category: category !== 0 && !category ? "(Blank)" : category,
//                         value: value,
//                         percentValue: 1,
//                         percentValueForHeight: 1,
//                         shiftValue: value >= 0 ? 0 : -1,
//                         colorSaturation: colorSaturation,
//                         selected: false,
//                         identity: identity,
//                         color: color,
//                         tooltips: tooltipItems,
//                         columnBy: columnBy,
//                         rowBy: rowBy
//                     });
//
//                     let highlightValue: number = columns[Field.Value].highlights ? columns[Field.Value].highlights[i] : null;
//
//                     if (highlightValue != null) {
//                         let highlightTooltipItems: VisualTooltipDataItem[] = tooltipItems.slice();
//
//                         highlightTooltipItems.push(this.createPercentTooltipData(valueMetadata, highlightValue, 1, this.Highlighted));
//
//                         let percentValue: number = highlightValue / value;
//
//                         data.push({
//                             category: category !== 0 && !category ? "(Blank)" : category,
//                             value: highlightValue,
//                             percentValue: percentValue,
//                             percentValueForHeight: percentValue,
//                             shiftValue: highlightValue >= 0 ? 0 : -percentValue,
//                             selected: false,
//                             identity: identity,
//                             highlight: true,
//                             color: color,
//                             tooltips: highlightTooltipItems,
//                             columnBy: columnBy,
//                             rowBy: rowBy
//                         });
//                     }
//                 }
//             });
//
//             return data;
//         }
//
//         private static GetGroupedValueColumns(dataView: DataView): VisualColumns {
//             let categorical: DataViewCategorical = dataView && dataView.categorical;
//             let categories: DataViewCategoricalColumn[] = categorical && categorical.categories || [];
//             let values: DataViewValueColumns = categorical && categorical.values;
//             let series: PrimitiveValue[] = categorical && values.source && this.getSeriesValues(dataView);
//             let grouped: DataViewValueColumnGroup[] = values && values.grouped();
//
//             let data: VisualColumns = new VisualColumns();
//
//             if (grouped) {
//                 data[Field.GroupedValues] = values;
//
//                 grouped.forEach(x => {
//                     for (let prop in data) {
//                         let columnArray: DataViewValueColumn[] = x.values.filter(y => y.source.roles[prop]);
//
//                         if (columnArray.length) {
//                             if (!data[prop]) {
//                                 data[prop] = columnArray;
//                             } else {
//                                 data[prop].push(...columnArray);
//                             }
//                         }
//                     }
//                 });
//             }
//
//             if (categorical) {
//                 for (let prop in data) {
//                     let columnArray: DataViewValueColumn[] = <DataViewValueColumn[]>categories.filter(y => y.source.roles[prop]);
//
//                     if (columnArray.length) {
//                         data[prop] = columnArray;
//                     }
//                 }
//             }
//
//             if (series) {
//                 data[Field.Legend] = series.filter((v, i, a) => a.indexOf(v) === i);
//             }
//
//             return data;
//         }
//
//         private static GetColumnsForMultipleValues(dataView: DataView): VisualColumns {
//             let categorical: DataViewCategorical = dataView && dataView.categorical;
//             let categories: DataViewCategoricalColumn[] = categorical && categorical.categories || [];
//             let values: DataViewValueColumns = categorical && categorical.values;
//
//             let data: VisualColumns = new VisualColumns();
//
//             if (categorical && values) {
//                 let valueColumns: DataViewValueColumn[] = values.filter(y => y.source.roles[Field.Value]);
//
//                 if (valueColumns.length) {
//                     if (!data[Field.Value]) {
//                         data[Field.Value] = valueColumns;
//                     }
//                 }
//
//                 let toolipColumns: DataViewValueColumn[] = values.filter(y => y.source.roles[Field.Tooltips]);
//
//                 if (toolipColumns.length) {
//                     if (!data[Field.Tooltips]) {
//                         data[Field.Tooltips] = toolipColumns;
//                     }
//                 }
//
//                 for (let prop in data) {
//                     let columnArray: DataViewValueColumn[] = <DataViewValueColumn[]>categories.filter(y => y.source.roles[prop]);
//
//                     if (columnArray.length) {
//                         data[prop] = columnArray;
//                     }
//                 }
//             }
//
//             return data;
//         }
//
//         private static GetColumnsWithNoLegend(dataView: DataView): VisualColumns {
//             let categorical: DataViewCategorical = dataView && dataView.categorical;
//             let categories: DataViewCategoricalColumn[] = categorical && categorical.categories || [];
//             let values: DataViewValueColumns = categorical && categorical.values;
//
//             let data: VisualColumns = new VisualColumns();
//
//             if (categorical && values) {
//                 let valueColumns: DataViewValueColumn[] = values.filter(y => y.source.roles[Field.Value]);
//
//                 if (valueColumns.length) {
//                     if (!data[Field.Value]) {
//                         data[Field.Value] = valueColumns[0];
//                     }
//                 }
//
//                 let toolipColumns: DataViewValueColumn[] = values.filter(y => y.source.roles[Field.Tooltips]);
//
//                 if (toolipColumns.length) {
//                     if (!data[Field.Tooltips]) {
//                         data[Field.Tooltips] = toolipColumns;
//                     }
//                 }
//
//                 for (let prop in data) {
//                     let columnArray: DataViewValueColumn[] = <DataViewValueColumn[]>categories.filter(y => y.source.roles[prop]);
//
//                     if (columnArray.length) {
//                         data[prop] = columnArray;
//                     }
//                 }
//             }
//
//             return data;
//         }
//
//         private static createTooltipData(metadataColumn: DataViewMetadataColumn, value: PrimitiveValue, displayName?: string): VisualTooltipDataItem {
//             return {
//                 displayName: displayName ? displayName : metadataColumn.displayName,
//                 value: this.getFormattedValue(metadataColumn, value)
//             };
//         }
//
//         private static createPercentTooltipData(metadataColumn: DataViewMetadataColumn, value: PrimitiveValue, percentValue: PrimitiveValue, displayName?: string): VisualTooltipDataItem {
//             return {
//                 displayName: displayName ? displayName : metadataColumn.displayName,
//                 value: this.getFormattedValue(metadataColumn, value) + " (" + ValueFormatter.format(percentValue, this.percentFormatString) + ")"
//             };
//         }
//
//         private static getSeriesValues(dataView: DataView): PrimitiveValue[] {
//             return dataView && dataView.categorical && dataView.categorical.values
//                 && dataView.categorical.values.map(x => converterHelper.getSeriesName(x.source));
//         }
//
//         private static getFormattedValue(column: DataViewMetadataColumn, value: any) {
//             let formatString: string = this.getFormatStringFromColumn(column);
//
//             return ValueFormatter.format(value, formatString);
//         }
//
//         private static getFormatStringFromColumn(column: DataViewMetadataColumn): string {
//             if (column) {
//                 let formatString: string = ValueFormatter.getFormatStringByColumn(column, false);
//
//                 return formatString || column.format;
//             }
//
//             return null;
//         }
}
