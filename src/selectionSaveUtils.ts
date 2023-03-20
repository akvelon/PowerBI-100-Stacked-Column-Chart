import powerbi from "powerbi-visuals-api";

import {VisualDataPoint} from "./visualInterfaces";

import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import VisualObjectInstance = powerbi.VisualObjectInstance;

export function saveSelection(selection: VisualDataPoint[], host: IVisualHost): void {
    const instance: VisualObjectInstance = {
        objectName: "selectionSaveSettings",
        selector: undefined,
        properties: {
            selection: JSON.stringify(selection)
        }
    };

    host.persistProperties({
        replace: [
            instance
        ]
    });
}
