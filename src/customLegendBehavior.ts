"use strict";

import {
    BaseDataPoint,
    IBehaviorOptions,
    IInteractiveBehavior, ISelectionHandler
} from "powerbi-visuals-utils-interactivityutils/lib/interactivityBaseService";
import {LegendDataPoint} from "powerbi-visuals-utils-chartutils/lib/legend/legendInterfaces";

import {d3Selection} from "./visualInterfaces";

export interface LegendBehaviorOptions extends IBehaviorOptions<BaseDataPoint> {
    legendItems: d3Selection<any>;
    legendIcons: d3Selection<any>;
    clearCatcher: d3Selection<any>;
}

export class CustomLegendBehavior implements IInteractiveBehavior {
    public static dimmedLegendColor = "#A6A6A6";
    protected legendIcons: d3Selection<any>;
    private saveSelection: () => void;

    constructor(saveSelection: () => void) {
        this.saveSelection = saveSelection;
    }

    public bindEvents(options: LegendBehaviorOptions, selectionHandler: ISelectionHandler): void {
        let legendItems = options.legendItems;
        this.legendIcons = options.legendIcons;
        let clearCatcher = options.clearCatcher;

        legendItems.on("click", (event: MouseEvent, d) => {
            selectionHandler.handleSelection(d, event.ctrlKey);
            this.saveSelection();
        });

        clearCatcher.on("click", () => {
            selectionHandler.handleClearSelection();
            this.saveSelection();
        });
    }

    public renderSelection(hasSelection: boolean): void {
        if (hasSelection) {
            this.legendIcons.style(
                "fill", (d: LegendDataPoint) => {
                    if (!d.selected) {
                        return CustomLegendBehavior.dimmedLegendColor;
                    } else {
                        return d.color;
                    }
                });
        } else {
            this.legendIcons.style(
                "fill", (d: LegendDataPoint) => {
                    return d.color;
                });
        }
    }
}

