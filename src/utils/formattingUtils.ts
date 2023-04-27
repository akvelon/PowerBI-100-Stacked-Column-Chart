"use strict";

import powerbi from "powerbi-visuals-api";
import {pixelConverter as PixelConverter} from "powerbi-visuals-utils-typeutils";
import {TextProperties} from "powerbi-visuals-utils-formattingutils/lib/src/interfaces";
import {dataLabelUtils} from "powerbi-visuals-utils-chartutils";
import {valueFormatter} from "powerbi-visuals-utils-formattingutils";

import {CategoryLabelsSettings} from "../settings";
import {VisualData} from "../visualInterfaces";

import DataViewMetadataColumn = powerbi.DataViewMetadataColumn;

export function getFormatStringByColumn(column: DataViewMetadataColumn) {
    return !column.format && column.type.numeric ? "0.00" : valueFormatter.getFormatStringByColumn(<any>column);
}

export function createFormatter(displayUnits: number, precision: number, column: DataViewMetadataColumn, value: number) {
    return valueFormatter.create({
        value: displayUnits === 0 && value ? value : displayUnits,
        value2: 0,
        precision: precision,
        format: this.getFormatStringByColumn(column)
    });
}

export function getValueForFormatter(data: VisualData) {
    return data.axes.x.axis.tickValues()[1];
}

export function getTextProperties(settings: CategoryLabelsSettings): TextProperties {
    const fontSizeInPx: string = PixelConverter.fromPoint(settings.fontSize);
    const fontFamily: string = settings.fontFamily ? settings.fontFamily : dataLabelUtils.LabelTextProperties.fontFamily;

    return {
        fontSize: fontSizeInPx.toString(),
        fontFamily: fontFamily
    };
}

export function getTextPropertiesForHeightCalculation(settings: CategoryLabelsSettings): TextProperties {
    const fontFamily: string = settings.fontFamily ? settings.fontFamily : dataLabelUtils.LabelTextProperties.fontFamily;

    return {
        fontSize: settings.fontSize.toString(),
        fontFamily: fontFamily
    };
}
