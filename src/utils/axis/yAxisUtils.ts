import { VisualSettings } from "../../settings";

export const getXAxisMaxWidth = (visualWidth: number, settings: VisualSettings): number => ((visualWidth) / 100) * settings.categoryAxis.maximumSize;
