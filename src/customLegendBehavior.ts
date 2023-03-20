/*
* Power BI Visualizations
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*
*  Permission is hereby granted, free of charge, to any person obtaining a copy
*  of this software and associated documentation files (the ""Software""), to deal
*  in the Software without restriction, including without limitation the rights
*  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
*  copies of the Software, and to permit persons to whom the Software is
*  furnished to do so, subject to the following conditions:
*
*  The above copyright notice and this permission notice shall be included in
*  all copies or substantial portions of the Software.
*
*  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
*  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
*  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
*  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
*  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
*  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
*  THE SOFTWARE.
*/

"use strict";

import {legendInterfaces, legendBehavior} from "powerbi-visuals-utils-chartutils";
import {interactivityBaseService} from "powerbi-visuals-utils-interactivityutils";

import {d3Selection} from "./visualInterfaces";

import LegendDataPoint = legendInterfaces.LegendDataPoint;
import LegendBehaviorOptions = legendBehavior.LegendBehaviorOptions;
import IInteractiveBehavior = interactivityBaseService.IInteractiveBehavior;
import ISelectionHandler = interactivityBaseService.ISelectionHandler;

export class CustomLegendBehavior implements IInteractiveBehavior {
    public static dimmedLegendColor = "#A6A6A6";
    protected legendIcons: d3Selection<any>;
    private saveSelection: () => void;

    constructor(saveSelection: () => void) {
        this.saveSelection = saveSelection;
    }

    public bindEvents(options: LegendBehaviorOptions, selectionHandler: ISelectionHandler): void {
        const legendItems = options.legendItems;
        this.legendIcons = options.legendIcons;
        const clearCatcher = options.clearCatcher;

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
                "fill",
                (d: LegendDataPoint) => {
                    if (!d.selected) {
                        return CustomLegendBehavior.dimmedLegendColor;
                    } else {
                        return d.color;
                    }
                });
        } else {
            this.legendIcons.style("fill", (d: LegendDataPoint) => d.color);
        }
    }
}
