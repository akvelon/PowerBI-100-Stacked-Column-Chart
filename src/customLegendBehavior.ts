import {
    IInteractiveBehavior,
    ISelectionHandler
} from "powerbi-visuals-utils-interactivityutils/lib/interactivityService";
import {LegendBehaviorOptions} from "powerbi-visuals-utils-chartutils/lib/legend/behavior/legendBehavior";

// module powerbi.extensibility.visual {
//     // powerbi.extensibility.utils.interactivity
//     import IInteractiveBehavior = powerbi.extensibility.utils.interactivity.IInteractiveBehavior;
//     import ISelectionHandler = powerbi.extensibility.utils.interactivity.ISelectionHandler;
//     import interactivityUtils = powerbi.extensibility.utils.interactivity.interactivityUtils;
//     import LegendDataPoint = powerbi.extensibility.utils.chart.legend.LegendDataPoint;
//
//     export interface LegendBehaviorOptions {
//         legendItems: d3.Selection<any>;
//         legendIcons: d3.Selection<any>;
//         clearCatcher: d3.Selection<any>;
//     }

export class CustomLegendBehavior implements IInteractiveBehavior {
//         public static dimmedLegendColor = "#A6A6A6";
//         protected legendIcons;
    private saveSelection: () => void;

    constructor(saveSelection: () => void) {
        this.saveSelection = saveSelection;
    }

    public bindEvents(options: LegendBehaviorOptions, selectionHandler: ISelectionHandler): void {
//             let legendItems = options.legendItems;
//             this.legendIcons = options.legendIcons;
//             let clearCatcher = options.clearCatcher;
//
//             legendItems.on("click", d => {
//                 selectionHandler.handleSelection(d, (d3.event as MouseEvent).ctrlKey);
//                 this.saveSelection();
//             });
//
//             clearCatcher.on("click", () => {
//                 selectionHandler.handleClearSelection();
//                 this.saveSelection();
//             });
    }

    public renderSelection(hasSelection: boolean): void {
//             if (hasSelection) {
//                 this.legendIcons.style({
//                     "fill": (d: LegendDataPoint) => {
//                         if (!d.selected) {
//                             return CustomLegendBehavior.dimmedLegendColor;
//                         }
//                         else {
//                             return d.color;
//                         }
//                     }
//                 });
//             }
//             else {
//                 this.legendIcons.style({
//                     "fill": (d: LegendDataPoint) => {
//                         return d.color;
//                     }
//                 });
//             }
//         }
    }
}
