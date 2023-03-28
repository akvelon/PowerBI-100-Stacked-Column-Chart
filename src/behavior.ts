"use strict";

import {
    BaseDataPoint,
    IBehaviorOptions,
    IInteractiveBehavior, IInteractivityService, ISelectionHandler
} from "powerbi-visuals-utils-interactivityutils/lib/interactivityBaseService";
import powerbi from "powerbi-visuals-api";

import {d3Selection, IColumnVisual, VisualDataPoint} from "./visualInterfaces";
import * as visualUtils from './utils';
import {Visual} from "./visual";

import IVisualHost = powerbi.extensibility.visual.IVisualHost;

export interface WebBehaviorOptions extends IBehaviorOptions<BaseDataPoint> {
    bars: d3Selection<any>;
    clearCatcher: d3Selection<any>;
    interactivityService: IInteractivityService<VisualDataPoint>;
    selectionSaveSettings?: any;
    host: IVisualHost;
}

export class WebBehavior implements IInteractiveBehavior {
    private visual: IColumnVisual;
    private options: WebBehaviorOptions;

    constructor(visual: IColumnVisual) {
        this.visual = visual;
    }

    public bindEvents(options: WebBehaviorOptions, selectionHandler: ISelectionHandler) {
        this.options = options;
        this.visual.webBehaviorSelectionHandler = selectionHandler;
    }

    public renderSelection(hasSelection: boolean) {
        const hasHighlight = this.visual.getAllDataPoints().filter(x => x.highlight).length > 0;

        this.options.bars.style(
            "fill-opacity", (p: VisualDataPoint) => visualUtils.getFillOpacity(
                p.selected,
                p.highlight,
                !p.highlight && hasSelection,
                !p.selected && hasHighlight))
            .style(
                "stroke", (p: VisualDataPoint) => {
                    if (hasSelection && visualUtils.isSelected(p.selected,
                        p.highlight,
                        !p.highlight && hasSelection,
                        !p.selected && hasHighlight)) {
                        return Visual.DefaultStrokeSelectionColor;
                    }

                    return p.color;
                })
            .style(
                "stroke-width", p => {
                    if (hasSelection && visualUtils.isSelected(p.selected,
                        p.highlight,
                        !p.highlight && hasSelection,
                        !p.selected && hasHighlight)) {
                        return Visual.DefaultStrokeSelectionWidth;
                    }

                    return Visual.DefaultStrokeWidth;
                });
    }
}
